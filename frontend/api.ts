const API_URL = 'http://localhost:8001/api';

interface RegistrationData {
  name: string;
  surname: string;
  email: string;
  tel: string;
  group?: string;
  organization?: string;
  messanger?: string,
  target?: string,
}

interface LoginData {
  login: string;
  password: string;
  remember?: boolean;
}

interface CreateUser {
  name: string;
  login: string;
  password: string;
  role: string;
}

interface AppUser {
  id: number;
  name: string;
  login: string;
  role: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthResponse {
  user: AppUser;
  message: string;
}

interface Booking {
  id: number;
  name: string;
  surname: string;
  email: string;
  tel: string;
  status: string
}

interface Files {
  id: number;
  original_name: string;
  path: string;
  mime_type: string;
  size: string;
  author_id: string;
  created_at: string;
}

interface File {
  id: number;
  original_name: string | null;
}

interface EditBook {
  id: number;
  status: string;
}

/* студент - 'id группы' учитель - 'id группы' родитель - 'child_id
сделать разбор по роли, передавать и сравнивать на беке
*/
interface FuncRole {
  role: string;
  id_owner: number;
  id_knave: number | null;
}

interface Groups {
  id: number | null;
  group_name: string;
  organization_id: number;
}
interface Organization {
  id: number | null;
  name: string;
}

interface newGroup {
  group_name: string;
  tutor_id: number;
  supervised_group_id: number;
  organization_id: number;
  name: string;
}

interface Task {
  id: number | null;
  group_id: number;
  task_id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  user_id: number;
}

interface Answer {
  id: number | null;
  answer_id: number;
  task_id: number;
  students_comment: string | null;
  teachers_comment: string | null;
  mark: string | null;
  user_id: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const defaultOptions: RequestInit = {
      headers,
      credentials: 'include',
      ...options,
    };
    const response = await fetch(url, defaultOptions);

    if (response.status == 401) {

    } else if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message ||
        error.errors?.login?.[0] ||
        error.errors?.password?.[0] ||
        'Ошибка сети'
      );
    }
    return response.json();
  }

  async register(data: RegistrationData): Promise<AuthResponse> {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createUser(data: any): Promise<{ T: AuthResponse, id: number }> {
    return this.request('/create-user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createGroup(data: newGroup): Promise<{ message: string }> {
    return this.request('/create-group', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createTask(data: Task): Promise<{ message: string }> {
    return this.request('/create-task', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createAnswer(data: any): Promise<{ message: string }> {
    return this.request('/set-answer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async paginate(endpoint: string, page: number, params?: any): Promise<{
    data: any;
    meta?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    }
  }> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        ...params
      });

      const url = `${endpoint}?${queryParams.toString()}`;

      const response = await this.request<any>(url, {
        method: 'GET',
      });

      return {
        data: response.data || response,
        meta: response.meta || {
          current_page: response.current_page,
          last_page: response.last_page,
          per_page: response.per_page,
          total: response.total,
        }
      };
    } catch (err: any) {
      console.error('Paginate error:', err.message);
      throw err;
    }
  }

  async createOrg(data: Organization): Promise<{ message: string }> {
    return this.request('/create-organization', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async gradeTask(data: any): Promise<{ message: string }> {
    return this.request('/grade-task', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async funcRole(data: FuncRole): Promise<{ message: string }> {
    return this.request('/funcrole', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUser(): Promise<AppUser> {
    return this.request('/user');
  }

  async getUserInfo(id: number): Promise<{ message: string }> {
    return this.request(`/get-user-info/${id}`, {
      method: 'GET',
    });
  }

  async getGroupInfo(id: number): Promise<{ message: string, data: any }> {
    return this.request(`/get-group-info/${id}`, {
      method: 'GET',
    });
  }

  async getTaskInfo(id: number): Promise<{ message: string, data: any }> {
    return this.request(`/get-task-info/${id}`, {
      method: 'GET',
    });
  }

  async getUsers(): Promise<AppUser[]> {
    try {
      const response = await this.request<any>('/users', {
        method: 'GET',
      });
      return response.users as AppUser[];
    }
    catch (error: any) {
      console.error(error.message)
      return []
    }
  }

  async getGroups(): Promise<{ message: string, data: any }> {
    try {
      return this.request<any>('/get-groups', {
        method: 'GET',
      });
    }
    catch (error: any) {
      console.error(error.message)
      return error.message
    }
  }

  async getOrganizations(): Promise<Organization[]> {
    try {
      const response = await this.request<any>('/get-organizations', {
        method: 'GET',
      });
      return response.data as Organization[];
    }
    catch (error: any) {
      console.error(error.message)
      return []
    }
  }

  async getOrganizationInfo(id: number): Promise<{ message: string, data: any }> {
    return await this.request<any>(`/get-organization-info/${id}`, {
      method: 'GET',
    });
  }

  async getTasks(): Promise<{ data: any }> {
    try {
      const response = await this.request<any>('/all-tasks', {
        method: 'GET',
      });
      return response;
    } catch (err: any) {
      console.error(err.message);
      return err.message
    }
  }

  async getAnswers(id: string = ''): Promise<{ data: any }> {
    try {
      const response = await this.request<any>(`/get-answers/${id}`, {
        method: 'GET',
      });
      return response;
    } catch (err: any) {
      console.error(err.message);
      return err.message;
    }
  }

  async logout(): Promise<{ message: string }> {
    return this.request('/logout', {
      method: 'POST',
    });
  }

  async editBooking(data: any): Promise<{ message: string }> {
    return this.request('/edit-booking', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getBooking(id?: string): Promise<{ data: any }> {
    try {
      console.log('Making request to /get-booking...');

      const response = await this.request<any>(`/get-booking/${id}`, {
        method: 'GET',
      });
      return response;
    } catch (error: any) {
      console.error('Error in getBooking:', error);
      return error.message;
    }
  }

  async saveFile(formData: FormData): Promise<{ message: string, data: any }> {
    try {
      for (const [key, value] of (formData as any).entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File - ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ${key}:`, value);
        }
      }

      return this.request('/save-file', {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async setAvatar(url: string, userId: number) {
    try {
      this.request('/set-avatar', {
        method: 'POST',
        body: JSON.stringify({
          url: url,
          id: userId
        }),
      });
    } catch (error: any) {
      console.log(error.message);
    }
  }

  async getFile(): Promise<Files[]> {
    try {
      const response = await this.request<any>('/get-files', {
        method: 'GET',
      });
      return response.data as Files[];
    } catch (error) {
      console.error('Error in getBooking:', error);
      return [];
    }
  }

  async loadFile(id: number): Promise<Files[]> {
    try {
      const response = await this.request<any>(`/load-file/${id}`, {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Error in loadFile:', error);
      return [];
    }
  }

  async deleteFile(data: number): Promise<Files[]> {
    try {
      return this.request('/delete-file/' + data, {
        method: 'delete',
      });
    } catch (error) {
      console.error('Error in deleteFile:', error);
      return [];
    }
  }
}

export const api = new ApiClient();
export type { RegistrationData, LoginData, CreateUser, AppUser, AuthResponse, Booking, Files, File, Groups, newGroup, Organization, Task, Answer }