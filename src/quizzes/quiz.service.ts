import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './quiz.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizAttempt } from './quiz-attempt.entity';
import { User } from '../users/users.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuizQuestionDto } from './dto/create-quiz-question.dto';
import { UpdateQuizQuestionDto } from './dto/update-quiz-question.dto';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuizAttemptStatus } from './enums/quiz-attempt-status.enum';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private readonly questionRepo: Repository<QuizQuestion>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepo: Repository<QuizAttempt>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private normalizeEmployeeId(employeeId: string) {
    return String(employeeId || '').trim().toUpperCase();
  }

  private sanitizeQuizForPlayer(quiz: Quiz) {
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      instructions: quiz.instructions,
      questions: (quiz.questions || [])
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
        .map((q) => ({
          id: q.id,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          marks: q.marks,
          sortOrder: q.sortOrder,
        })),
    };
  }

  private async getQuizOrFail(id: number) {
    const quiz = await this.quizRepo.findOne({
      where: { id },
      relations: { questions: true },
      order: { questions: { sortOrder: 'ASC', id: 'ASC' } as any },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async create(dto: CreateQuizDto) {
    if (dto.isActive) {
      await this.quizRepo.createQueryBuilder().update(Quiz).set({ isActive: false }).execute();
    }
    const quiz = this.quizRepo.create({
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      instructions: dto.instructions?.trim() || null,
      isActive: dto.isActive ?? false,
    });
    return this.quizRepo.save(quiz);
  }

  async findAll() {
    const quizzes = await this.quizRepo.find({
      relations: { questions: true },
      order: { createdAt: 'DESC', questions: { sortOrder: 'ASC', id: 'ASC' } as any },
    });
    return quizzes.map((quiz) => ({
      ...quiz,
      questionCount: quiz.questions?.length || 0,
    }));
  }

  async findOne(id: number) {
    const quiz = await this.getQuizOrFail(id);
    return {
      ...quiz,
      resultsSummary: await this.getQuizResultsSummary(id),
    };
  }

  async update(id: number, dto: UpdateQuizDto) {
    const quiz = await this.getQuizOrFail(id);
    if (dto.isActive) {
      await this.quizRepo
        .createQueryBuilder()
        .update(Quiz)
        .set({ isActive: false })
        .where('id != :id', { id })
        .execute();
    }
    if (dto.title !== undefined) quiz.title = dto.title.trim();
    if (dto.description !== undefined) quiz.description = dto.description?.trim() || null;
    if (dto.instructions !== undefined) quiz.instructions = dto.instructions?.trim() || null;
    if (dto.isActive !== undefined) quiz.isActive = dto.isActive;
    return this.quizRepo.save(quiz);
  }

  async remove(id: number) {
    const quiz = await this.getQuizOrFail(id);
    await this.quizRepo.remove(quiz);
    return { message: 'Quiz deleted successfully' };
  }

  async setActive(id: number, isActive: boolean) {
    await this.getQuizOrFail(id);
    if (isActive) {
      await this.quizRepo.createQueryBuilder().update(Quiz).set({ isActive: false }).execute();
    }
    await this.quizRepo.update(id, { isActive });
    return this.findOne(id);
  }

  async addQuestion(quizId: number, dto: CreateQuizQuestionDto) {
    const quiz = await this.getQuizOrFail(quizId);
    const question = this.questionRepo.create({
      quiz,
      questionText: dto.questionText.trim(),
      optionA: dto.optionA.trim(),
      optionB: dto.optionB.trim(),
      optionC: dto.optionC.trim(),
      optionD: dto.optionD.trim(),
      correctOption: dto.correctOption,
      marks: dto.marks ?? 1,
      sortOrder: dto.sortOrder ?? (quiz.questions?.length || 0) + 1,
    });
    await this.questionRepo.save(question);
    return this.findOne(quizId);
  }

  async updateQuestion(quizId: number, questionId: number, dto: UpdateQuizQuestionDto) {
    await this.getQuizOrFail(quizId);
    const question = await this.questionRepo.findOne({
      where: { id: questionId, quiz: { id: quizId } },
      relations: { quiz: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (dto.questionText !== undefined) question.questionText = dto.questionText.trim();
    if (dto.optionA !== undefined) question.optionA = dto.optionA.trim();
    if (dto.optionB !== undefined) question.optionB = dto.optionB.trim();
    if (dto.optionC !== undefined) question.optionC = dto.optionC.trim();
    if (dto.optionD !== undefined) question.optionD = dto.optionD.trim();
    if (dto.correctOption !== undefined) question.correctOption = dto.correctOption;
    if (dto.marks !== undefined) question.marks = dto.marks;
    if (dto.sortOrder !== undefined) question.sortOrder = dto.sortOrder;
    await this.questionRepo.save(question);
    return this.findOne(quizId);
  }

  async removeQuestion(quizId: number, questionId: number) {
    const question = await this.questionRepo.findOne({
      where: { id: questionId, quiz: { id: quizId } },
      relations: { quiz: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    await this.questionRepo.remove(question);
    return this.findOne(quizId);
  }

  async getQuizResultsSummary(quizId: number) {
    const attempts = await this.attemptRepo.find({
      where: { quiz: { id: quizId }, status: QuizAttemptStatus.SUBMITTED },
      order: { submittedAt: 'DESC' },
    });
    const totalAttempts = attempts.length;
    const averageScore = totalAttempts
      ? Number((attempts.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / totalAttempts).toFixed(2))
      : 0;
    return {
      totalAttempts,
      averageScore,
      highestScore: totalAttempts ? Math.max(...attempts.map((a) => Number(a.percentage || 0))) : 0,
    };
  }

  async getResults(quizId: number) {
    await this.getQuizOrFail(quizId);
    const attempts = await this.attemptRepo.find({
      where: { quiz: { id: quizId }, status: QuizAttemptStatus.SUBMITTED },
      order: { submittedAt: 'DESC' },
    });
    return {
      summary: await this.getQuizResultsSummary(quizId),
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        employeeId: attempt.employeeId,
        employeeName: attempt.employeeName,
        departmentName: attempt.departmentName,
        designationName: attempt.designationName,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: Number(attempt.percentage || 0),
        submittedAt: attempt.submittedAt,
        createdAt: attempt.createdAt,
      })),
    };
  }

  async getActiveQuiz() {
    const quiz = await this.quizRepo.findOne({
      where: { isActive: true },
      relations: { questions: true },
      order: { questions: { sortOrder: 'ASC', id: 'ASC' } as any },
    });
    if (!quiz) throw new NotFoundException('No active quiz available');
    if (!quiz.questions?.length) {
      throw new BadRequestException('Active quiz has no questions yet');
    }
    return this.sanitizeQuizForPlayer(quiz);
  }

  async getEmployeeDetails(employeeId: string) {
    const normalized = this.normalizeEmployeeId(employeeId);
    if (!/^HSL\d{4}$/.test(normalized)) {
      throw new BadRequestException('Employee ID must be in HSL0000 format');
    }
    const user = await this.userRepo.findOne({
      where: { employeeId: normalized },
      relations: { department: true, designation: true },
    });
    if (!user) throw new NotFoundException('Employee not found in employee list');
    return {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      department: user.department?.name || '',
      designation: (user.designation as any)?.designationName || (user.designation as any)?.title || (user.designation as any)?.name || '',
    };
  }

  async startQuiz(dto: StartQuizDto) {
    const employeeId = this.normalizeEmployeeId(dto.employeeId);
    const quiz = await this.getQuizOrFail(dto.quizId);
    if (!quiz.isActive) {
      throw new ForbiddenException('This quiz is not active right now');
    }
    if (!quiz.questions?.length) {
      throw new BadRequestException('Quiz has no questions');
    }
    const employee = await this.getEmployeeDetails(employeeId);

    const existingSubmitted = await this.attemptRepo.findOne({
      where: {
        quiz: { id: quiz.id },
        employeeId,
        status: QuizAttemptStatus.SUBMITTED,
      },
    });
    if (existingSubmitted) {
      throw new ConflictException('This employee has already submitted the quiz');
    }

    let attempt = await this.attemptRepo.findOne({
      where: {
        quiz: { id: quiz.id },
        employeeId,
        status: QuizAttemptStatus.STARTED,
      },
    });

    if (!attempt) {
      attempt = this.attemptRepo.create({
        quiz,
        user: { id: employee.id } as any,
        employeeId,
        employeeName: employee.name,
        departmentName: employee.department,
        designationName: employee.designation,
        status: QuizAttemptStatus.STARTED,
      });
      attempt = await this.attemptRepo.save(attempt);
    }

    return {
      attemptId: attempt.id,
      employee,
      quiz: this.sanitizeQuizForPlayer(quiz),
    };
  }

  async getAttemptForPlayer(attemptId: number) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId },
      relations: { quiz: { questions: true } },
    });
    if (!attempt) throw new NotFoundException('Quiz attempt not found');
    return {
      attemptId: attempt.id,
      employee: {
        employeeId: attempt.employeeId,
        name: attempt.employeeName,
        department: attempt.departmentName,
        designation: attempt.designationName,
      },
      status: attempt.status,
      quiz: this.sanitizeQuizForPlayer(attempt.quiz),
    };
  }

  async submitQuiz(attemptId: number, dto: SubmitQuizDto) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId },
      relations: { quiz: { questions: true } },
    });
    if (!attempt) throw new NotFoundException('Quiz attempt not found');
    if (attempt.status === QuizAttemptStatus.SUBMITTED) {
      throw new ConflictException('Quiz already submitted');
    }

    const questions = (attempt.quiz.questions || []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
    );
    if (!questions.length) throw new BadRequestException('Quiz has no questions');

    const answerMap = new Map(dto.answers.map((item) => [Number(item.questionId), item.selectedOption]));
    const totalMarks = questions.reduce((sum, item) => sum + Number(item.marks || 0), 0);

    const answers = questions.map((question) => {
      const selectedOption = answerMap.get(question.id);
      const isCorrect = selectedOption === question.correctOption;
      return {
        questionId: question.id,
        selectedOption: selectedOption || '',
        correctOption: question.correctOption,
        isCorrect,
        marksAwarded: isCorrect ? Number(question.marks || 0) : 0,
      };
    });

    const score = answers.reduce((sum, answer) => sum + Number(answer.marksAwarded || 0), 0);
    const percentage = totalMarks ? Number(((score / totalMarks) * 100).toFixed(2)) : 0;

    attempt.answers = answers;
    attempt.score = score;
    attempt.totalMarks = totalMarks;
    attempt.percentage = percentage;
    attempt.status = QuizAttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();
    await this.attemptRepo.save(attempt);

    return {
      message: 'Quiz submitted successfully',
      result: {
        employeeId: attempt.employeeId,
        employeeName: attempt.employeeName,
        departmentName: attempt.departmentName,
        score,
        totalMarks,
        percentage,
      },
    };
  }
}
