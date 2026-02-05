import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { User } from './users.entity';
import { Department } from '../departments/department.entity';
import { Designation } from '../designations/designation.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,

    @InjectRepository(Designation)
    private readonly designationRepo: Repository<Designation>,
  ) {}

  // ✅ REQUIRED FOR AUTH
  async findByEmail(email: string) {
    // password column is select:false, so we explicitly select it for auth
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('user.designation', 'designation')
      .where('user.email = :email', { email })
      .getOne();
  }

  // ✅ SMART SEARCH FOR USERS (name / employeeId / email)
  async searchUsers(q: string) {
    const query = (q || '').trim();
    if (!query) return [];

    return this.userRepo.find({
      where: [
        { name: ILike(`%${query}%`) },
        { employeeId: ILike(`%${query}%`) },
        { email: ILike(`%${query}%`) },
      ],
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  /**
   * 🔒 HOD scope: HOD can only operate on users within their own department.
   * ADMIN/HR roles bypass scope.
   */
  private async assertHodScopeForUser(requester: any, targetUserId: number) {
    const role = String(requester?.role || '').toUpperCase();
    if (role !== 'HOD') return;

    const requesterDeptId = Number(requester?.departmentId);
    if (!requesterDeptId) {
      throw new ForbiddenException('HOD department not found in token');
    }

    const target = await this.userRepo.findOne({
      where: { id: targetUserId },
      relations: ['department'],
    });
    if (!target) throw new NotFoundException('User not found');

    const targetDeptId = Number(target?.department?.id);
    if (targetDeptId !== requesterDeptId) {
      throw new ForbiddenException('You can only edit users in your department');
    }
  }

  // ✅ LIST USERS (scoped)
  async findAllScoped(requester: any) {
    const role = String(requester?.role || '').toUpperCase();
    if (role === 'HOD') {
      const deptId = Number(requester?.departmentId);
      return this.userRepo.find({
        where: { department: { id: deptId } },
        relations: { department: true, designation: true },
        order: { createdAt: 'DESC' },
      });
    }

    return this.userRepo.find({
      relations: { department: true, designation: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ✅ GET USER (scoped)
  async findOneScoped(requester: any, id: number) {
    await this.assertHodScopeForUser(requester, id);
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { department: true, designation: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ✅ SEARCH USERS (scoped)
  async searchUsersScoped(requester: any, q: string) {
    const query = (q || '').trim();
    if (!query) return [];

    const role = String(requester?.role || '').toUpperCase();
    if (role === 'HOD') {
      const deptId = Number(requester?.departmentId);
      return this.userRepo.find({
        where: [
          { name: ILike(`%${query}%`), department: { id: deptId } },
          { employeeId: ILike(`%${query}%`), department: { id: deptId } },
          { email: ILike(`%${query}%`), department: { id: deptId } },
        ],
        relations: { department: true, designation: true },
        order: { createdAt: 'DESC' },
        take: 20,
      });
    }

    return this.searchUsers(query);
  }

  // ✅ UPDATE USER (scoped)
  async updateScoped(requester: any, id: number, dto: UpdateUserDto) {
    await this.assertHodScopeForUser(requester, id);
    return this.update(id, dto);
  }

  // ✅ UPDATE PASSWORD (scoped)
  async updatePasswordScoped(requester: any, id: number, dto: ChangePasswordDto) {
    await this.assertHodScopeForUser(requester, id);
    return this.updatePassword(id, dto);
  }

  // ✅ helper: fetch user with password
  private async findOneWithPassword(id: number) {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  // CREATE USER
  async create(dto: CreateUserDto) {
    const email = (dto.email || '').trim().toLowerCase();
    const employeeId = (dto.employeeId || '').trim();

    // ✅ HR might accidentally try to add same email/employeeId again.
    // Instead of crashing with DB error, return a clean 409.
    const existing = await this.userRepo.findOne({
      where: [{ email }, { employeeId }],
    });
    if (existing) {
      if (existing.email === email) {
        throw new ConflictException(`Email already exists: ${email}`);
      }
      if (existing.employeeId === employeeId) {
        throw new ConflictException(
          `Employee ID already exists: ${employeeId}`,
        );
      }
      throw new ConflictException('User already exists');
    }

    const department = await this.departmentRepo.findOne({
      where: { id: dto.departmentId },
    });
    if (!department) throw new NotFoundException('Department not found');

    const designation = await this.designationRepo.findOne({
      where: { id: dto.designationId },
    });
    if (!designation) throw new NotFoundException('Designation not found');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      name: dto.name,
      email,
      employeeId,
      mobile: dto.mobile,
      password: hashedPassword,
      role: dto.role,
      employeeType: dto.employeeType,
      department,
      designation,
      dateOfJoining: new Date(dto.dateOfJoining),
      isActive: dto.isActive ?? true,
      biometricLinked: dto.biometricLinked ?? false,
    });

    return this.userRepo.save(user);
  }

  // LIST USERS
  findAll() {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  // GET ONE
  findOne(id: number) {
    return this.userRepo.findOne({
      where: { id },
    });
  }

  // UPDATE USER
  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');

    // ✅ If email/employeeId is being changed, block duplicates with a clean 409
    if (dto.email && dto.email.trim().toLowerCase() !== user.email) {
      const email = dto.email.trim().toLowerCase();
      const exists = await this.userRepo
        .createQueryBuilder('u')
        .where('u.email = :email', { email })
        .andWhere('u.id != :id', { id })
        .getOne();
      if (exists) throw new ConflictException(`Email already exists: ${email}`);
      user.email = email;
    }

    if (dto.employeeId && dto.employeeId.trim() !== user.employeeId) {
      const employeeId = dto.employeeId.trim();
      const exists = await this.userRepo
        .createQueryBuilder('u')
        .where('u.employeeId = :employeeId', { employeeId })
        .andWhere('u.id != :id', { id })
        .getOne();
      if (exists)
        throw new ConflictException(
          `Employee ID already exists: ${employeeId}`,
        );
      user.employeeId = employeeId;
    }

    if (dto.departmentId) {
      const department = await this.departmentRepo.findOne({
        where: { id: dto.departmentId },
      });
      if (!department) throw new NotFoundException('Department not found');
      user.department = department;
    }

    if (dto.designationId) {
      const designation = await this.designationRepo.findOne({
        where: { id: dto.designationId },
      });
      if (!designation) throw new NotFoundException('Designation not found');
      user.designation = designation;
    }

    if (dto.dateOfJoining) user.dateOfJoining = new Date(dto.dateOfJoining);

    if (dto.role) user.role = dto.role;
    if (dto.name) user.name = dto.name;
    if (dto.mobile) user.mobile = dto.mobile;

    // Worker / Staff
    if (dto.employeeType) user.employeeType = dto.employeeType;

    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.biometricLinked !== undefined)
      user.biometricLinked = dto.biometricLinked;

    // 🔐 if password is provided in edit, hash it and update
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    return this.userRepo.save(user);
  }

  // ✅ UPDATE PASSWORD (Dedicated)
  async updatePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.findOneWithPassword(id);
    if (!user) throw new NotFoundException('User not found');

    // ✅ TS + runtime safety: password must exist here
    if (!user.password) {
      throw new BadRequestException(
        'Password is not available for this user (select:false / data issue)',
      );
    }

    // If oldPassword provided -> verify
    if (dto.oldPassword && dto.oldPassword.trim().length > 0) {
      const ok = await bcrypt.compare(dto.oldPassword, user.password);
      if (!ok) throw new BadRequestException('Old password is incorrect');
    }

    if (!dto.newPassword || dto.newPassword.trim().length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);

    return { message: 'Password updated successfully' };
  }

  // DELETE USER
  remove(id: number) {
    return this.userRepo.delete(id);
  }

  // ✅ REQUIRED FOR DASHBOARD
  async getUserStats() {
    const total = await this.userRepo.count();
    const active = await this.userRepo.count({ where: { isActive: true } });
    const inactive = await this.userRepo.count({ where: { isActive: false } });

    return { total, active, inactive };
  }

  // 📥 BULK CREATE USERS FROM EXCEL BUFFER
  // Supports headers (case/space-insensitive):
  // name,email,employeeId,mobile,password,departmentId/department,designationId/designation,
  // role,employeeType,dateOfJoining,isActive,biometricLinked
  // Note: Multer's file.buffer type can differ slightly across @types/node versions.
  // We accept any Buffer/Uint8Array-compatible input and cast when loading into ExcelJS.
  async bulkCreateFromExcel(requester: any, buffer: any) {
    const role = String(requester?.role || '').toUpperCase();
    if (!['ADMIN', 'HRD', 'HR'].includes(role)) {
      throw new ForbiddenException('You are not allowed to bulk upload users');
    }

    // ⚠️ ExcelJS has a known reconciliation crash with some .xlsx files
    // ("Cannot read properties of undefined (reading 'comments')").
    // For bulk upload we only need raw cell values, so we parse via SheetJS (xlsx)
    // which is much more tolerant of such workbook parts.
    const wb = XLSX.read(buffer as any, {
      type: 'buffer',
      cellDates: true,
      dense: true,
    } as any);
    const firstSheetName = wb.SheetNames?.[0];
    if (!firstSheetName) throw new BadRequestException('No worksheet found in file');
    const ws = wb.Sheets[firstSheetName];
    if (!ws) throw new BadRequestException('No worksheet found in file');

    // Read as rows (array-of-arrays) so we can keep original row index for error reporting.
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      blankrows: false,
    }) as any;

    if (!rows.length) throw new BadRequestException('Excel sheet is empty');

    const headerRow = rows[0] || [];
    const headerMap: Record<string, number> = {};
    for (let c = 0; c < headerRow.length; c++) {
      const raw = String(headerRow[c] ?? '').trim();
      if (!raw) continue;
      // Normalize + map common template headers (with *, hints, etc.) to canonical keys.
      const key = this.canonicalHeader(this.normalizeHeader(raw));
      // store 0-based index
      headerMap[key] = c;
    }

    const required = ['name', 'email', 'employeeid', 'mobile'];
    const missing = required.filter((k) => headerMap[k] === undefined);
    if (missing.length) {
      throw new BadRequestException(
        `Missing required columns in header row: ${missing.join(', ')}`,
      );
    }

    const results = {
      totalRows: 0,
      created: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{
        row: number;
        status: 'CREATED' | 'SKIPPED' | 'ERROR';
        message: string;
        employeeId?: string;
        email?: string;
      }>,
    };

    // Lookup caches (avoid repeated DB hits)
    const deptById = new Map<number, Department>();
    const deptByName = new Map<string, Department>();
    const desigById = new Map<number, Designation>();
    const desigByName = new Map<string, Designation>();

    // rows[0] is header, so start from index 1
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const excelRowNumber = i + 1; // 1-based in Excel

      const name = this.getCellString(row, headerMap['name']);
      const emailRaw = this.getCellString(row, headerMap['email']);
      const employeeId = this.getCellString(row, headerMap['employeeid']);
      const mobile = this.getCellString(row, headerMap['mobile']);

      if (!name && !emailRaw && !employeeId && !mobile) continue;
      results.totalRows += 1;

      try {
        const email = (emailRaw || '').trim().toLowerCase();
        if (!name || !email || !employeeId || !mobile) {
          throw new BadRequestException('Required fields missing');
        }

        // Optional columns
        const password = this.getCellString(row, headerMap['password']) || 'Welcome@123';

        const roleVal =
          (this.getCellString(row, headerMap['role']) || 'EMPLOYEE')
            .trim()
            .toUpperCase();

        const empTypeVal =
          (this.getCellString(row, headerMap['employeetype']) || 'STAFF')
            .trim()
            .toUpperCase();

        const isActive = this.getCellBoolean(row, headerMap['isactive'], true);
        const biometricLinked = this.getCellBoolean(
          row,
          headerMap['biometriclinked'],
          false,
        );

        const doj = this.getCellDate(row, headerMap['dateofjoining']);

        // Department / Designation (id or name)
        const department = await this.resolveDepartment(row, headerMap, deptById, deptByName);
        const designation = await this.resolveDesignation(row, headerMap, desigById, desigByName);

        if (!department) throw new NotFoundException('Department not found');
        if (!designation) throw new NotFoundException('Designation not found');

        // Duplicates check
        const existing = await this.userRepo.findOne({
          where: [{ email }, { employeeId }],
        });
        if (existing) {
          results.skipped += 1;
          results.details.push({
            row: excelRowNumber,
            status: 'SKIPPED',
            message:
              existing.email === email
                ? `Email already exists: ${email}`
                : `Employee ID already exists: ${employeeId}`,
            employeeId,
            email,
          });
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = this.userRepo.create({
          name,
          email,
          employeeId,
          mobile,
          password: hashedPassword,
          role: roleVal as any,
          employeeType: empTypeVal as any,
          department,
          designation,
          dateOfJoining: doj ?? new Date(),
          isActive,
          biometricLinked,
        });

        await this.userRepo.save(user);

        results.created += 1;
        results.details.push({
          row: excelRowNumber,
          status: 'CREATED',
          message: 'Created',
          employeeId,
          email,
        });
      } catch (e: any) {
        results.errors += 1;
        const msg =
          e?.response?.message || e?.message || 'Unknown error during upload';
        results.details.push({
          row: excelRowNumber,
          status: 'ERROR',
          message: Array.isArray(msg) ? msg.join(', ') : String(msg),
          employeeId: this.getCellString(row, headerMap['employeeid']) || undefined,
          email: this.getCellString(row, headerMap['email']) || undefined,
        });
      }
    }

    return results;
  }

  private normalizeHeader(h: string) {
    // Make headers robust against templates like:
    // "Employee Name*", "Password* (min 6)", "Date of Joining* (YYYY-MM-DD)", etc.
    // Keep only a-z0-9 so hints/symbols don't break matching.
    return String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  // Map normalized header tokens to canonical keys used by this uploader.
  private canonicalHeader(normalized: string) {
    const h = normalized;

    // Required
    if (['name', 'employeename', 'fullname', 'username'].includes(h)) return 'name';
    if (['email', 'emailid', 'emailaddress'].includes(h)) return 'email';
    if (['employeeid', 'empid', 'employeeidd'].includes(h)) return 'employeeid';
    if (['mobile', 'mobileno', 'mobilenumber', 'phone', 'phonenumber'].includes(h))
      return 'mobile';

    // Optional (common template variants)
    if (['password', 'passwordmin6', 'passwordmin6characters', 'passwordmin6chars'].includes(h))
      return 'password';
    if (['departmentid', 'deptid'].includes(h)) return 'departmentid';
    if (['department', 'deptname'].includes(h)) return 'department';
    if (['designationid', 'desigid'].includes(h)) return 'designationid';
    if (['designation', 'designationname'].includes(h)) return 'designation';
    if (['role', 'roleadminhrhodemployee'].includes(h)) return 'role';
    if (
      [
        'employeetype',
        'workerstaff',
        'workerstaffworkerstaff',
        'workerorstaff',
      ].includes(h)
    )
      return 'employeetype';
    if (['dateofjoining', 'doj', 'datejoining'].includes(h)) return 'dateofjoining';
    if (['isactive', 'active', 'isactivetruefalse'].includes(h)) return 'isactive';
    if (['biometriclinked', 'biometric', 'biometriclinkedtruefalse'].includes(h))
      return 'biometriclinked';

    return h;
  }

  // Row is an array (0-based indexes) from SheetJS (xlsx)
  private getCellString(row: any[], col?: number) {
    if (col === undefined) return '';
    const v = row?.[col] as any;
    if (v == null) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    // SheetJS can return Date objects when cellDates=true
    if (typeof v === 'object') {
      if (v instanceof Date) return v.toISOString();
    }
    return String(v).trim();
  }

  private getCellBoolean(row: any[], col?: number, defaultVal = false) {
    if (col === undefined) return defaultVal;
    const raw = this.getCellString(row, col).trim().toLowerCase();
    if (!raw) return defaultVal;
    return ['1', 'true', 'yes', 'y', 'active'].includes(raw);
  }

  private getCellDate(row: any[], col?: number): Date | null {
    if (col === undefined) return null;
    const v = row?.[col] as any;
    if (!v) return null;
    if (v instanceof Date) return v;
    const s = this.getCellString(row, col);
    if (!s) return null;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  private async resolveDepartment(
    row: any[],
    headerMap: Record<string, number>,
    cacheById: Map<number, Department>,
    cacheByName: Map<string, Department>,
  ) {
    const deptIdCol = headerMap['departmentid'];
    const deptNameCol = headerMap['department'];

    const deptIdStr = this.getCellString(row, deptIdCol);
    const deptName = this.getCellString(row, deptNameCol);

    if (deptIdStr) {
      const id = Number(deptIdStr);
      if (!Number.isFinite(id) || id <= 0) return null;
      if (cacheById.has(id)) return cacheById.get(id) || null;
      const dept = await this.departmentRepo.findOne({ where: { id } });
      if (dept) cacheById.set(id, dept);
      return dept;
    }

    if (deptName) {
      const key = deptName.trim().toLowerCase();
      if (cacheByName.has(key)) return cacheByName.get(key) || null;
      const dept = await this.departmentRepo.findOne({
        where: { name: ILike(deptName.trim()) },
      });
      if (dept) cacheByName.set(key, dept);
      return dept;
    }

    return null;
  }

  private async resolveDesignation(
    row: any[],
    headerMap: Record<string, number>,
    cacheById: Map<number, Designation>,
    cacheByName: Map<string, Designation>,
  ) {
    const desigIdCol = headerMap['designationid'];
    const desigNameCol = headerMap['designation'];

    const desigIdStr = this.getCellString(row, desigIdCol);
    const desigName = this.getCellString(row, desigNameCol);

    if (desigIdStr) {
      const id = Number(desigIdStr);
      if (!Number.isFinite(id) || id <= 0) return null;
      if (cacheById.has(id)) return cacheById.get(id) || null;
      const desig = await this.designationRepo.findOne({ where: { id } });
      if (desig) cacheById.set(id, desig);
      return desig;
    }

    if (desigName) {
      const key = desigName.trim().toLowerCase();
      if (cacheByName.has(key)) return cacheByName.get(key) || null;
      const desig = await this.designationRepo.findOne({
        where: { designationName: ILike(desigName.trim()) },
      });
      if (desig) cacheByName.set(key, desig);
      return desig;
    }

    return null;
  }
}
