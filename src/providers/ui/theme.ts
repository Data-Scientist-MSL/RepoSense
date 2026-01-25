/**
 * Sprint 2: UI Theme System
 * Glassmorphism design tokens for premium, modern aesthetic
 */

export const theme = {
    colors: {
        // Primary palette (Teal/Slate for AI feel)
        primary: {
            50: 'hsl(180, 65%, 95%)',
            100: 'hsl(180, 60%, 90%)',
            200: 'hsl(180, 55%, 80%)',
            300: 'hsl(180, 50%, 70%)',
            400: 'hsl(180, 45%, 60%)',
            500: 'hsl(180, 40%, 50%)',  // Main
            600: 'hsl(180, 45%, 40%)',
            700: 'hsl(180, 50%, 30%)',
            800: 'hsl(180, 55%, 20%)',
            900: 'hsl(180, 60%, 10%)',
        },
        
        // Neutral (Dark mode optimized)
        neutral: {
            50: 'hsl(220, 20%, 98%)',
            100: 'hsl(220, 15%, 95%)',
            200: 'hsl(220, 15%, 90%)',
            300: 'hsl(220, 12%, 80%)',
            400: 'hsl(220, 10%, 60%)',
            500: 'hsl(220, 8%, 40%)',
            600: 'hsl(220, 10%, 30%)',
            700: 'hsl(220, 12%, 20%)',
            800: 'hsl(220, 15%, 12%)',
            900: 'hsl(220, 18%, 8%)',
        },
        
        // Semantic
        success: 'hsl(142, 76%, 36%)',
        warning: 'hsl(38, 92%, 50%)',
        error: 'hsl(0, 84%, 60%)',
        info: 'hsl(199, 89%, 48%)',
    },
    
    // Glassmorphism effects
    glass: {
        background: 'rgba(255, 255, 255, 0.05)',
        backgroundDark: 'rgba(0, 0, 0, 0.2)',
        border: 'rgba(255, 255, 255, 0.1)',
        blur: '12px',
        shadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    },
    
    // Typography
    fonts: {
        sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        mono: '"SF Mono", "Fira Code", "Consolas", monospace',
    },
    
    // Spacing
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
    },
    
    // Border radius
    radius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
    },
    
    // Animations
    animations: {
        duration: {
            fast: '150ms',
            normal: '250ms',
            slow: '350ms',
        },
        easing: {
            easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
            easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
            easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        },
    },
} as const;

export type Theme = typeof theme;

// CSS-in-JS helper
export const glassMorphismStyle = {
    background: theme.glass.background,
    backdropFilter: `blur(${theme.glass.blur})`,
    border: `1px solid ${theme.glass.border}`,
    boxShadow: theme.glass.shadow,
    borderRadius: theme.radius.lg,
};
