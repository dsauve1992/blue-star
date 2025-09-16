import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
} from "axios";
import {
  type ApiResponse,
  type ApiError,
  type ApiRequestConfig,
  type ApiClientConfig,
} from "./types";

export class ApiClient {
  private client: AxiosInstance;
  private tokenProvider?: () => Promise<string | null>;

  constructor(config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      withCredentials: config.withCredentials || false,
    });

    this.setupInterceptors();
  }

  setTokenProvider(provider: () => Promise<string | null>) {
    this.tokenProvider = provider;
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.tokenProvider?.();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message || "An unexpected error occurred",
          status: error.response?.status || 500,
          code: error.code,
        };

        if (error.response?.data) {
          const responseData = error.response.data as {
            message?: string;
            error?: string;
          };
          apiError.message =
            responseData.message || responseData.error || apiError.message;
        }

        return Promise.reject(apiError);
      },
    );
  }

  async get<T>(
    url: string,
    config?: ApiRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, this.buildAxiosConfig(config));
  }

  async post<T, R>(
    url: string,
    data?: R,
    config?: ApiRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(
      url,
      data,
      this.buildAxiosConfig(config),
    );
    return response.data;
  }

  async put<T, R>(
    url: string,
    data?: R,
    config?: ApiRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(
      url,
      data,
      this.buildAxiosConfig(config),
    );
    return response.data;
  }

  async patch<T, R>(
    url: string,
    data?: R,
    config?: ApiRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(
      url,
      data,
      this.buildAxiosConfig(config),
    );
    return response.data;
  }

  async delete<T>(
    url: string,
    config?: ApiRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(
      url,
      this.buildAxiosConfig(config),
    );
    return response.data;
  }

  private buildAxiosConfig(config?: ApiRequestConfig): AxiosRequestConfig {
    return {
      headers: config?.headers,
      params: config?.params,
      timeout: config?.timeout,
    };
  }
}
