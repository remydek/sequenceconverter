# Supabase Setup Guide for Premium Transparent Video Creator

This guide will help you set up Supabase for authentication and usage tracking in your premium transparent video creator app.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `transparent-video-creator`
   - Database Password: Generate a strong password
   - Region: Choose closest to your users
5. Click "Create new project"

## 2. Configure Authentication

### Enable Google OAuth (Recommended)

1. Go to Authentication → Settings → Auth Providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - **Client ID**: `YOUR_GOOGLE_CLIENT_ID`
   - **Client Secret**: `YOUR_GOOGLE_CLIENT_SECRET`
   - **Redirect URL**: Copy from your Supabase Auth settings

4. **Important**: Make sure your Google Cloud Console OAuth 2.0 Client has the correct redirect URI:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID
   - Ensure the Authorized redirect URIs includes your Supabase callback URL (found in Supabase Auth settings)

### Configure Email Authentication

1. In Supabase Auth Settings
2. Enable "Email" provider
3. Configure email templates if needed
4. Set up SMTP (optional, uses Supabase's by default)

## 3. Create Database Tables

Run these SQL commands in the Supabase SQL Editor:

```sql
-- Create user profiles table
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage logs table
CREATE TABLE usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    action_type TEXT NOT NULL,
    frame_count INTEGER,
    output_format TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_user_date ON usage_logs(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for usage_logs
CREATE POLICY "Users can view own usage logs" ON usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs" ON usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, subscription_tier)
    VALUES (NEW.id, NEW.email, 'free');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 4. Configure Your App

1. Copy your Supabase project URL and anon key:
   - Go to Settings → API
   - Copy "Project URL" and "anon public" key

2. Update `static/app_premium.js`:
   ```javascript
   // Replace these with your actual Supabase credentials
   this.supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
   this.supabaseKey = 'YOUR_ANON_KEY_HERE';
   ```

## 5. Test the Setup

1. Start your premium app:
   ```bash
   python app_premium.py
   ```

2. Open http://localhost:5001

3. Test authentication:
   - Try Google sign-in
   - Try email sign-in
   - Check that user profile is created in Supabase dashboard

4. Test usage tracking:
   - Create a video
   - Check usage_logs table in Supabase dashboard

## 6. Production Considerations

### Security
- Never expose your service role key in frontend code
- Use environment variables for sensitive data
- Configure proper CORS settings
- Set up proper RLS policies

### Performance
- Add database indexes for frequently queried fields
- Consider caching user profiles
- Monitor database performance

### Monitoring
- Set up Supabase monitoring and alerts
- Track usage patterns and costs
- Monitor authentication success rates

## 7. Optional: Stripe Integration for Pro Subscriptions

For handling payments (future implementation):

1. Create Stripe account
2. Add webhook endpoints
3. Create subscription products
4. Update user_profiles table with subscription data
5. Handle webhook events to update subscription status

## 8. Environment Variables

Create a `.env` file for production:

```env
FLASK_ENV=production
PORT=5001
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Troubleshooting

### Common Issues

1. **Authentication not working**
   - Check OAuth redirect URLs
   - Verify Supabase credentials
   - Check browser console for errors

2. **Database permissions errors**
   - Verify RLS policies are correct
   - Check user authentication status
   - Ensure proper table permissions

3. **Usage tracking not working**
   - Check network requests in browser dev tools
   - Verify user is authenticated
   - Check Supabase logs

### Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com/)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

## Next Steps

1. Set up your Supabase project using this guide
2. Configure authentication providers
3. Test the premium app locally
4. Deploy to production
5. Monitor usage and optimize as needed
6. Consider adding payment processing for pro subscriptions
