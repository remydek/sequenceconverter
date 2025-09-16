/**
 * Authentication service using Supabase
 * Handles user authentication, profile management, and session handling
 */

import { User, AuthState, AppConfig } from '../types';
import { AppError } from '../utils/errors';

interface SupabaseClient {
    auth: {
        getSession(): Promise<{ data: { session: any }, error: any }>;
        signInWithOAuth(options: { provider: string }): Promise<{ error: any }>;
        signOut(): Promise<{ error: any }>;
        onAuthStateChange(callback: (event: string, session: any) => void): { data: { subscription: any } };
    };
    from(table: string): any;
}

declare global {
    interface Window {
        supabase: {
            createClient(url: string, key: string): SupabaseClient;
        };
    }
}

export class AuthService {
    private static instance: AuthService;
    private supabase: SupabaseClient | null = null;
    private currentUser: User | null = null;
    private authState: AuthState = {
        user: null,
        isLoading: true,
        isAuthenticated: false
    };
    private authCallbacks: ((state: AuthState) => void)[] = [];

    private constructor() {}

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    public async initialize(config: AppConfig): Promise<void> {
        if (!config.supabase || !window.supabase) {
            console.warn('⚠️ Supabase not configured, running without authentication');
            this.updateAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false
            });
            return;
        }

        try {
            this.supabase = window.supabase.createClient(
                config.supabase.url,
                config.supabase.anonKey
            );

            // Set up auth state listener
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('🔐 Auth state changed:', event);
                this.handleAuthStateChange(event, session);
            });

            // Check current session
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
            } else if (session) {
                await this.setUserFromSession(session);
            }

            this.updateAuthState({
                ...this.authState,
                isLoading: false
            });

            console.log('✅ Auth service initialized');

        } catch (error) {
            console.error('❌ Auth initialization failed:', error);
            this.updateAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false
            });
        }
    }

    private handleAuthStateChange(event: string, session: any): void {
        switch (event) {
            case 'SIGNED_IN':
                this.setUserFromSession(session);
                break;
            case 'SIGNED_OUT':
                this.currentUser = null;
                this.updateAuthState({
                    user: null,
                    isLoading: false,
                    isAuthenticated: false
                });
                break;
            case 'TOKEN_REFRESHED':
                // Session is still valid
                break;
        }
    }

    private async setUserFromSession(session: any): Promise<void> {
        if (!session?.user) return;

        try {
            // Get additional user data from profiles table if it exists
            let userData = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
                avatar_url: session.user.user_metadata?.avatar_url,
                created_at: session.user.created_at
            };

            // Try to get extended profile data
            if (this.supabase) {
                try {
                    const { data: profile } = await this.supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profile) {
                        userData = { ...userData, ...profile };
                    }
                } catch (profileError) {
                    // Profile table might not exist, that's okay
                    console.warn('Could not fetch user profile:', profileError);
                }
            }

            this.currentUser = userData as User;
            this.updateAuthState({
                user: this.currentUser,
                isLoading: false,
                isAuthenticated: true
            });

        } catch (error) {
            console.error('Error setting user from session:', error);
            this.updateAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false
            });
        }
    }

    private updateAuthState(newState: AuthState): void {
        this.authState = newState;
        this.authCallbacks.forEach(callback => callback(newState));
    }

    public onAuthStateChange(callback: (state: AuthState) => void): () => void {
        this.authCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            this.authCallbacks = this.authCallbacks.filter(cb => cb !== callback);
        };
    }

    public getAuthState(): AuthState {
        return { ...this.authState };
    }

    public getCurrentUser(): User | null {
        return this.currentUser ? { ...this.currentUser } : null;
    }

    public isAuthenticated(): boolean {
        return this.authState.isAuthenticated;
    }

    public isLoading(): boolean {
        return this.authState.isLoading;
    }

    public async signInWithGoogle(): Promise<void> {
        if (!this.supabase) {
            throw new AppError({
                code: 'AUTH_NOT_CONFIGURED',
                message: 'Authentication is not configured',
                timestamp: new Date()
            });
        }

        try {
            const { error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google'
            });

            if (error) {
                throw new AppError({
                    code: 'GOOGLE_AUTH_FAILED',
                    message: error.message || 'Google authentication failed',
                    details: error,
                    timestamp: new Date()
                });
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError({
                code: 'AUTH_ERROR',
                message: 'Authentication failed. Please try again.',
                details: error,
                timestamp: new Date()
            });
        }
    }

    public async signOut(): Promise<void> {
        if (!this.supabase) {
            // If no Supabase, just clear local state
            this.currentUser = null;
            this.updateAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false
            });
            return;
        }

        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) {
                console.error('Sign out error:', error);
                // Continue anyway to clear local state
            }

            this.currentUser = null;
            this.updateAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false
            });

        } catch (error) {
            console.error('Error signing out:', error);
            // Clear local state anyway
            this.currentUser = null;
            this.updateAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false
            });
        }
    }

    public async updateProfile(updates: Partial<User>): Promise<User> {
        if (!this.isAuthenticated() || !this.currentUser) {
            throw new AppError({
                code: 'NOT_AUTHENTICATED',
                message: 'Please sign in to update your profile',
                timestamp: new Date()
            });
        }

        if (!this.supabase) {
            throw new AppError({
                code: 'AUTH_NOT_CONFIGURED',
                message: 'Authentication is not configured',
                timestamp: new Date()
            });
        }

        try {
            // Update profile in database
            const { data, error } = await this.supabase
                .from('profiles')
                .update(updates)
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) {
                throw new AppError({
                    code: 'PROFILE_UPDATE_FAILED',
                    message: error.message || 'Failed to update profile',
                    details: error,
                    timestamp: new Date()
                });
            }

            // Update local user data
            const updatedUser = { ...this.currentUser, ...data };
            this.currentUser = updatedUser;

            this.updateAuthState({
                ...this.authState,
                user: updatedUser
            });

            return updatedUser;

        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError({
                code: 'PROFILE_UPDATE_ERROR',
                message: 'Failed to update profile. Please try again.',
                details: error,
                timestamp: new Date()
            });
        }
    }

    public async trackUsage(action: string): Promise<void> {
        if (!this.isAuthenticated() || !this.currentUser || !this.supabase) {
            return; // Silently fail if not authenticated
        }

        try {
            await this.supabase
                .from('usage_logs')
                .insert({
                    user_id: this.currentUser.id,
                    action,
                    timestamp: new Date().toISOString()
                });
        } catch (error) {
            // Don't throw errors for usage tracking
            console.warn('Failed to track usage:', error);
        }
    }

    public async checkUsageLimit(): Promise<{ allowed: boolean; remaining: number; limit: number }> {
        if (!this.isAuthenticated() || !this.currentUser) {
            return { allowed: true, remaining: Infinity, limit: Infinity };
        }

        if (!this.supabase) {
            return { allowed: true, remaining: Infinity, limit: Infinity };
        }

        try {
            // Get user's current usage count for today
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await this.supabase
                .from('usage_logs')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .gte('timestamp', `${today}T00:00:00.000Z`)
                .lt('timestamp', `${today}T23:59:59.999Z`);

            if (error) {
                console.warn('Failed to check usage limit:', error);
                return { allowed: true, remaining: Infinity, limit: Infinity };
            }

            const usageCount = data?.length || 0;
            const limit = this.currentUser.usage_limit || 10; // Default limit
            const remaining = Math.max(0, limit - usageCount);

            return {
                allowed: usageCount < limit,
                remaining,
                limit
            };

        } catch (error) {
            console.warn('Error checking usage limit:', error);
            return { allowed: true, remaining: Infinity, limit: Infinity };
        }
    }

    public requireAuth(): void {
        if (!this.isAuthenticated()) {
            throw new AppError({
                code: 'AUTHENTICATION_REQUIRED',
                message: 'Please sign in to continue',
                timestamp: new Date()
            });
        }
    }

    public cleanup(): void {
        this.authCallbacks = [];
        this.currentUser = null;
        this.supabase = null;
        this.authState = {
            user: null,
            isLoading: false,
            isAuthenticated: false
        };
    }
}

// Singleton export
export const authService = AuthService.getInstance();