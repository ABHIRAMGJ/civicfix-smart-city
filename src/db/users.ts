import { db } from './index.ts';
import { users } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getOrCreateUser(
  uid: string,
  email: string,
  name?: string,
  role?: string,
  departmentId?: number | null
) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (existing.length > 0) {
      return existing[0];
    }

    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0] || 'Citizen User',
        role: role || 'citizen',
        departmentId: departmentId ?? null,
        emailVerified: true,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize user profile with database.', { cause: error });
  }
}

export async function getUserByEmail(email: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.email, email));
    return rows[0] || null;
  } catch (error) {
    console.error('Database getUserByEmail failed:', error);
    throw new Error('Failed to look up user by email.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database getUserByUid failed:', error);
    throw new Error('Failed to look up user profile.', { cause: error });
  }
}

export async function createRegisteredUser(data: {
  uid: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  departmentId?: number | null;
  phone?: string;
  otpCode?: string;
}) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid: data.uid,
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: data.role,
        departmentId: data.departmentId ?? null,
        phone: data.phone ?? null,
        emailVerified: true,
        otpCode: data.otpCode ?? '482910',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: data.email,
          name: data.name,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database createRegisteredUser failed:', error);
    throw new Error('Failed to register user account.', { cause: error });
  }
}

export async function listAllUsers() {
  try {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  } catch (error) {
    console.error('Database listAllUsers failed:', error);
    throw new Error('Failed to retrieve users list.', { cause: error });
  }
}

export async function updateUserRoleAndDept(
  userId: number,
  role: string,
  departmentId: number | null
) {
  try {
    const result = await db
      .update(users)
      .set({ role, departmentId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database updateUserRoleAndDept failed:', error);
    throw new Error('Failed to update user role.', { cause: error });
  }
}
