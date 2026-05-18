import SQLite, { ResultSet, SQLiteDatabase } from 'react-native-sqlite-storage';
import { Task, Step, User } from '../types';

const DB_NAME = 'focuspet.db';

SQLite.enablePromise(true);

let db: SQLiteDatabase | null = null;

async function getDb(): Promise<SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
  }
  return db;
}

function resultRowsToArray(result: ResultSet): any[] {
  const rows: any[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(result.rows.item(i));
  }
  return rows;
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDb();

  await database.executeSql('PRAGMA foreign_keys = ON;');

  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      coins INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streakDays INTEGER DEFAULT 0,
      lastActiveDate TEXT,
      authProvider TEXT DEFAULT 'LOCAL',
      passwordHash TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      userId INTEGER,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'completed')),
      totalXP INTEGER DEFAULT 0,
      totalCoins INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      completedAt TEXT,
      blockUntil TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      description TEXT NOT NULL,
      isDone INTEGER DEFAULT 0,
      xpReward INTEGER DEFAULT 0,
      coinReward INTEGER DEFAULT 0,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY,
      userId INTEGER UNIQUE,
      name TEXT DEFAULT 'Pöllö',
      happiness INTEGER DEFAULT 70,
      mood TEXT DEFAULT 'happy',
      accessories TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT,
      lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await database.executeSql(
    `CREATE INDEX IF NOT EXISTS idx_tasks_userId ON tasks(userId);`,
  );
  await database.executeSql(
    `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`,
  );
  await database.executeSql(
    `CREATE INDEX IF NOT EXISTS idx_steps_taskId ON steps(taskId);`,
  );

  console.log('✓ Database initialized successfully');
}

// ─── User Operations ──────────────────────────────────────────────────────────

export async function createOrUpdateUser(user: any): Promise<any> {
  const database = await getDb();
  const {
    id,
    username,
    email,
    coins = 0,
    xp = 0,
    level = 1,
    streakDays = 0,
    lastActiveDate,
    passwordHash,
    authProvider = 'LOCAL',
  } = user;

  await database.executeSql(
    `INSERT OR REPLACE INTO users
     (id, username, email, coins, xp, level, streakDays, lastActiveDate, passwordHash, authProvider, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      username,
      email,
      coins,
      xp,
      level,
      streakDays,
      lastActiveDate || null,
      passwordHash || null,
      authProvider,
    ],
  );

  return user;
}

export async function getUserById(userId: number): Promise<User | null> {
  const database = await getDb();
  const [result] = await database.executeSql(
    'SELECT * FROM users WHERE id = ?',
    [userId],
  );
  const rows = resultRowsToArray(result);
  return (rows[0] as User) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const database = await getDb();
  const [result] = await database.executeSql(
    'SELECT * FROM users WHERE email = ?',
    [email.toLowerCase()],
  );
  const rows = resultRowsToArray(result);
  return (rows[0] as User) || null;
}

export async function getUserByUsername(
  username: string,
): Promise<User | null> {
  const database = await getDb();
  const [result] = await database.executeSql(
    'SELECT * FROM users WHERE username = ?',
    [username],
  );
  const rows = resultRowsToArray(result);
  return (rows[0] as User) || null;
}

export async function updateUserStats(
  userId: number,
  updates: Partial<User>,
): Promise<User | null> {
  const database = await getDb();
  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.coins !== undefined) {
    setClauses.push('coins = ?');
    values.push(updates.coins);
  }
  if (updates.xp !== undefined) {
    setClauses.push('xp = ?');
    values.push(updates.xp);
  }
  if (updates.level !== undefined) {
    setClauses.push('level = ?');
    values.push(updates.level);
  }
  if (updates.streakDays !== undefined) {
    setClauses.push('streakDays = ?');
    values.push(updates.streakDays);
  }
  if (updates.lastActiveDate !== undefined) {
    setClauses.push('lastActiveDate = ?');
    values.push(updates.lastActiveDate);
  }

  if (setClauses.length === 0) return getUserById(userId);

  setClauses.push("updatedAt = datetime('now')");
  values.push(userId);

  await database.executeSql(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
    values,
  );
  return getUserById(userId);
}

// ─── Task Operations ──────────────────────────────────────────────────────────

export async function createTask(task: Task, userId?: number): Promise<Task> {
  const database = await getDb();

  await database.executeSql(
    `INSERT INTO tasks (id, userId, title, status, totalXP, totalCoins, createdAt, blockUntil)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      userId || null,
      task.title,
      task.status,
      task.totalXP,
      task.totalCoins,
      task.createdAt,
      task.blockUntil || null,
    ],
  );

  for (const step of task.steps) {
    await database.executeSql(
      `INSERT INTO steps (id, taskId, "order", emoji, description, isDone, xpReward, coinReward)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        step.id,
        task.id,
        step.order,
        step.emoji,
        step.description,
        step.isDone ? 1 : 0,
        step.xpReward,
        step.coinReward,
      ],
    );
  }

  return task;
}

function rowsToSteps(rows: any[]) {
  return rows.map(s => ({
    id: s.id,
    order: s.order,
    emoji: s.emoji,
    description: s.description,
    isDone: s.isDone === 1,
    xpReward: s.xpReward,
    coinReward: s.coinReward,
  }));
}

export async function getTaskById(taskId: string): Promise<Task | null> {
  const database = await getDb();
  const [taskResult] = await database.executeSql(
    'SELECT * FROM tasks WHERE id = ?',
    [taskId],
  );
  const taskRows = resultRowsToArray(taskResult);
  const taskRow = taskRows[0];
  if (!taskRow) return null;

  const [stepsResult] = await database.executeSql(
    'SELECT * FROM steps WHERE taskId = ? ORDER BY "order"',
    [taskId],
  );
  const stepRows = resultRowsToArray(stepsResult);
  return {
    ...taskRow,
    steps: rowsToSteps(stepRows),
  };
}

export async function getUserTasks(userId: number): Promise<Task[]> {
  const database = await getDb();
  const [taskRowsResult] = await database.executeSql(
    'SELECT * FROM tasks WHERE userId = ? ORDER BY createdAt DESC',
    [userId],
  );
  const taskRows = resultRowsToArray(taskRowsResult);
  const tasks: Task[] = [];

  for (const taskRow of taskRows) {
    const [stepsResult] = await database.executeSql(
      'SELECT * FROM steps WHERE taskId = ? ORDER BY "order"',
      [taskRow.id],
    );
    const stepRows = resultRowsToArray(stepsResult);
    tasks.push({ ...taskRow, steps: rowsToSteps(stepRows) });
  }

  return tasks;
}

export async function updateTask(task: Task): Promise<void> {
  const database = await getDb();

  await database.executeSql(
    `UPDATE tasks SET title = ?, status = ?, totalXP = ?, totalCoins = ?,
     completedAt = ?, blockUntil = ? WHERE id = ?`,
    [
      task.title,
      task.status,
      task.totalXP,
      task.totalCoins,
      task.completedAt || null,
      task.blockUntil || null,
      task.id,
    ],
  );

  for (const step of task.steps) {
    await database.executeSql(
      `UPDATE steps SET emoji = ?, description = ?, isDone = ?, xpReward = ?, coinReward = ? WHERE id = ?`,
      [
        step.emoji,
        step.description,
        step.isDone ? 1 : 0,
        step.xpReward,
        step.coinReward,
        step.id,
      ],
    );
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const database = await getDb();
  await database.executeSql('DELETE FROM tasks WHERE id = ?', [taskId]);
}

// ─── Pet Operations ───────────────────────────────────────────────────────────

export interface PetState {
  id?: number;
  userId: number;
  name: string;
  happiness: number;
  mood: string;
  accessories: string[];
}

export async function createOrUpdatePet(pet: PetState): Promise<PetState> {
  const database = await getDb();
  await database.executeSql(
    `INSERT OR REPLACE INTO pets (userId, name, happiness, mood, accessories, updatedAt)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [
      pet.userId,
      pet.name,
      pet.happiness,
      pet.mood,
      JSON.stringify(pet.accessories),
    ],
  );
  return pet;
}

export async function getPetByUserId(userId: number): Promise<PetState | null> {
  const database = await getDb();
  const [result] = await database.executeSql(
    'SELECT * FROM pets WHERE userId = ?',
    [userId],
  );
  const rows = resultRowsToArray(result);
  const row = rows[0];
  if (!row) return null;
  return { ...row, accessories: JSON.parse(row.accessories || '[]') };
}

// ─── Sync Metadata ────────────────────────────────────────────────────────────

export async function setSyncMetadata(
  key: string,
  value: string,
): Promise<void> {
  const database = await getDb();
  await database.executeSql(
    `INSERT OR REPLACE INTO sync_metadata (key, value, lastUpdated) VALUES (?, ?, datetime('now'))`,
    [key, value],
  );
}

export async function getSyncMetadata(key: string): Promise<string | null> {
  const database = await getDb();
  const [result] = await database.executeSql(
    'SELECT value FROM sync_metadata WHERE key = ?',
    [key],
  );
  const rows = resultRowsToArray(result);
  return rows[0]?.value || null;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  const database = await getDb();
  await database.executeSql('DELETE FROM steps;');
  await database.executeSql('DELETE FROM tasks;');
  await database.executeSql('DELETE FROM pets;');
  await database.executeSql('DELETE FROM users;');
  await database.executeSql('DELETE FROM sync_metadata;');
  console.log('✓ All data cleared');
}
