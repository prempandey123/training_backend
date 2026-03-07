import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuizQuestionDto } from './dto/create-quiz-question.dto';
import { UpdateQuizQuestionDto } from './dto/update-quiz-question.dto';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Controller()
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('quizzes')
  @Roles('ADMIN', 'HRD')
  findAll() {
    return this.quizService.findAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('quizzes')
  @Roles('ADMIN', 'HRD')
  create(@Body() dto: CreateQuizDto) {
    return this.quizService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('quizzes/:id')
  @Roles('ADMIN', 'HRD')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quizService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Put('quizzes/:id')
  @Roles('ADMIN', 'HRD')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuizDto) {
    return this.quizService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('quizzes/:id')
  @Roles('ADMIN', 'HRD')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.quizService.remove(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('quizzes/:id/active')
  @Roles('ADMIN', 'HRD')
  setActive(
    @Param('id', ParseIntPipe) id: number,
    @Query('value', ParseBoolPipe) value: boolean,
  ) {
    return this.quizService.setActive(id, value);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('quizzes/:id/questions')
  @Roles('ADMIN', 'HRD')
  addQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateQuizQuestionDto,
  ) {
    return this.quizService.addQuestion(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Put('quizzes/:quizId/questions/:questionId')
  @Roles('ADMIN', 'HRD')
  updateQuestion(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuizQuestionDto,
  ) {
    return this.quizService.updateQuestion(quizId, questionId, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('quizzes/:quizId/questions/:questionId')
  @Roles('ADMIN', 'HRD')
  removeQuestion(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    return this.quizService.removeQuestion(quizId, questionId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('quizzes/:id/results')
  @Roles('ADMIN', 'HRD')
  getResults(@Param('id', ParseIntPipe) id: number) {
    return this.quizService.getResults(id);
  }

  @Get('public-quiz/active')
  getActiveQuiz() {
    return this.quizService.getActiveQuiz();
  }

  @Get('public-quiz/employee/:employeeId')
  getEmployee(@Param('employeeId') employeeId: string) {
    return this.quizService.getEmployeeDetails(employeeId);
  }

  @Post('public-quiz/start')
  startQuiz(@Body() dto: StartQuizDto) {
    return this.quizService.startQuiz(dto);
  }

  @Get('public-quiz/attempt/:attemptId')
  getAttempt(@Param('attemptId', ParseIntPipe) attemptId: number) {
    return this.quizService.getAttemptForPlayer(attemptId);
  }

  @Post('public-quiz/attempt/:attemptId/submit')
  submitQuiz(
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizService.submitQuiz(attemptId, dto);
  }
}
