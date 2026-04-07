import axios from 'axios';
import { User, Task, Step } from '../types';

/**
 * API configuration — switch between localhost (dev) and production
 */
const API_BASE = __DEV__
  ? 'http://10.0.2.2:8080/api' // Android emulator
  : 'https://focuspet-api.example.com/api'; // Production

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── User API ─────────────────────────────────────────────────────────────

export async function fetchUser(userId: number): Promise<User | null> {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (err) {
    console.error('[API] Failed to fetch user:', err);
    return null;
  }
}

export async function createUser(
  username: string,
  email: string,
): Promise<User | null> {
  try {
    const response = await apiClient.post('/users', { username, email });
    return response.data;
  } catch (err) {
    console.error('[API] Failed to create user:', err);
    return null;
  }
}

export async function updateUserStats(
  userId: number,
  coins: number,
  xp: number,
  level: number,
  streakDays: number,
): Promise<User | null> {
  try {
    const response = await apiClient.put(`/users/${userId}`, {
      coins,
      xp,
      level,
      streakDays,
    });
    return response.data;
  } catch (err) {
    console.error('[API] Failed to update user stats:', err);
    return null;
  }
}

// ─── Task API ─────────────────────────────────────────────────────────────

export async function fetchUserTasks(userId: number): Promise<Task[]> {
  try {
    const response = await apiClient.get(`/tasks/user/${userId}`);
    return response.data || [];
  } catch (err) {
    console.error('[API] Failed to fetch tasks:', err);
    return [];
  }
}

export async function fetchTask(taskId: number): Promise<Task | null> {
  try {
    const response = await apiClient.get(`/tasks/${taskId}`);
    return response.data;
  } catch (err) {
    console.error('[API] Failed to fetch task:', err);
    return null;
  }
}

export async function createTask(
  userId: number,
  title: string,
  steps: Step[],
): Promise<Task | null> {
  try {
    const response = await apiClient.post(`/tasks?userId=${userId}`, {
      title,
      status: 'IDLE',
      steps,
    });
    return response.data;
  } catch (err) {
    console.error('[API] Failed to create task:', err);
    return null;
  }
}

export async function completeTask(taskId: number): Promise<Task | null> {
  try {
    const response = await apiClient.put(`/tasks/${taskId}/complete`);
    return response.data;
  } catch (err) {
    console.error('[API] Failed to complete task:', err);
    return null;
  }
}

export async function deleteTask(taskId: number): Promise<boolean> {
  try {
    await apiClient.delete(`/tasks/${taskId}`);
    return true;
  } catch (err) {
    console.error('[API] Failed to delete task:', err);
    return false;
  }
}

// ─── Pet API ──────────────────────────────────────────────────────────────

export async function fetchPet(userId: number) {
  try {
    const response = await apiClient.get(`/pets/user/${userId}`);
    return response.data;
  } catch (err) {
    console.error('[API] Failed to fetch pet:', err);
    return null;
  }
}

export async function updatePetHappiness(petId: number, delta: number) {
  try {
    const response = await apiClient.put(
      `/pets/${petId}/happiness?delta=${delta}`,
    );
    return response.data;
  } catch (err) {
    console.error('[API] Failed to update pet happiness:', err);
    return null;
  }
}

// ─── Offline fallback: if API unavailable ─────────────────────────────────

export function isAPIAvailable(): boolean {
  return __DEV__; // Only use API in dev; MVP uses AsyncStorage
}
