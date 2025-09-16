# Supabase Setup for Free Transparent Video Creator

Simple setup guide for authentication and download tracking. No payment or subscription tiers!

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Enter project details:
   - Name: `transparent-video-free`
   - Database Password: Generate a strong password
   - Region: Choose closest to your users
4. Click "Create new project"

## 2. Set Up Authentication

### Enable Google OAuth

1. Go to Authentication → Providers
2. Enable Google provider
3. Get OAuth credentials from Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI from Supabase

### Enable Email Authentication

1. In Supabase Auth Settings
2. Enable "Email" provider
3. Use default email templates (or customize if desired)

## 3. Create Database Tables

Run this SQL in the Supabase SQL Editor:

```sql
-- Create user profiles table (simple)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create downloads tracking table
CREATE TABLE downloads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    format TEXT NOT NULL,
    frame_count INTEGER,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_downloads_user_id ON downloads(user_id);
CREATE INDEX idx_downloads_created_at ON downloads(created_at);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS policies for downloads
CREATE POLICY "Users can view own downloads" ON downloads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own downloads" ON downloads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Anonymous users can also insert downloads (for skip auth option)
CREATE POLICY "Anonymous downloads allowed" ON downloads
    FOR INSERT WITH CHECK (user_id IS NULL);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update last_seen
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles 
    SET last_seen = NOW() 
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_seen on download
CREATE TRIGGER on_download_created
    AFTER INSERT ON downloads
    FOR EACH ROW 
    WHEN (NEW.user_id IS NOT NULL)
    EXECUTE FUNCTION public.update_last_seen();
```

## 4. Configure Your App

1. Get your Supabase credentials:
   - Go to Settings → API
   - Copy "Project URL" and "anon public" key

2. Update `static/app_free.js`:
   ```javascript
   // Replace with your actual credentials
   this.supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
   this.supabaseKey = 'YOUR_ANON_KEY';
   ```

## 5. Optional: Analytics Views

Create useful views for tracking usage:

```sql
-- Daily active users
CREATE VIEW daily_active_users AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_downloads
FROM downloads
WHERE user_id IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Popular formats
CREATE VIEW popular_formats AS
SELECT 
    format,
    COUNT(*) as usage_count,
    AVG(file_size) as avg_file_size,
    AVG(frame_count) as avg_frame_count
FROM downloads
GROUP BY format
ORDER BY usage_count DESC;

-- User statistics
CREATE VIEW user_stats AS
SELECT 
    u.email,
    u.created_at as joined_date,
    u.last_seen,
    COUNT(d.id) as total_downloads,
    MAX(d.created_at) as last_download
FROM user_profiles u
LEFT JOIN downloads d ON u.id = d.user_id
GROUP BY u.id, u.email, u.created_at, u.last_seen;
```

## 6. Testing

1. Start your app:
   ```bash
   python app_free.py
   ```

2. Test the flow:
   - Upload PNG files
   - Create a video (fully client-side)
   - Try to download (should prompt for auth)
   - Sign in with Google or email
   - Download should work
   - Check Supabase dashboard for user profile and download record

## 7. Environment Variables (Optional)

For production, create a `.env` file:

```env
FLASK_ENV=production
PORT=5000
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

## That's It! 🎉

Your free transparent video creator is ready. Users can:
- Process videos entirely in their browser
- Optionally sign up when downloading
- All processing is free and unlimited
- You get user emails for future updates

No payment processing, no subscription management, just simple and free!