/**
 * Sprint 2: Modern Sidebar Component
 * React-based glassmorphism UI for VS Code webview
 */

import * as React from 'react';
import { theme, glassMorphismStyle } from './theme';

// Webview API type declaration
declare const vscode: {
    postMessage: (message: any) => void;
};

interface Tab {
    id: string;
    label: string;
    icon: string;
}

const tabs: Tab[] = [
    { id: 'intelligence', label: 'Intelligence', icon: '🧠' },
    { id: 'gaps', label: 'Gaps', icon: '⚠️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export const ModernSidebar: React.FC = () => {
    const [activeTab, setActiveTab] = React.useState('intelligence');
    const [isLoading, setIsLoading] = React.useState(false);

    const handleScan = () => {
        setIsLoading(true);
        // @ts-ignore - vscode API injected by webview
        if (typeof vscode !== 'undefined') {
            vscode.postMessage({ command: 'scanRepository' });
        }
        setTimeout(() => setIsLoading(false), 2000);
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <header style={headerStyle}>
                <div style={logoStyle}>
                    <span style={{ fontSize: '24px' }}>🔍</span>
                    <h1 style={titleStyle}>RepoSense</h1>
                </div>
                <button 
                    onClick={handleScan}
                    style={scanButtonStyle}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span style={spinnerStyle}>⟳</span>
                    ) : (
                        '▶ Scan'
                    )}
                </button>
            </header>

            {/* Tab Navigation */}
            <nav style={tabContainerStyle}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            ...tabButtonStyle,
                            ...(activeTab === tab.id ? activeTabStyle : {}),
                        }}
                    >
                        <span style={{ marginRight: '8px' }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* Content Area */}
            <main style={contentStyle}>
                {activeTab === 'intelligence' && <IntelligenceView />}
                {activeTab === 'gaps' && <GapsView />}
                {activeTab === 'settings' && <SettingsView />}
            </main>
        </div>
    );
};

// Sub-components
const IntelligenceView: React.FC = () => (
    <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Repository Intelligence</h2>
        <div style={statGridStyle}>
            <StatCard label="Critical Nodes" value="12" trend="+2" />
            <StatCard label="Coverage" value="78%" trend="+5%" />
            <StatCard label="Gaps" value="24" trend="-3" />
        </div>
    </div>
);

const GapsView: React.FC = () => (
    <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Detected Gaps</h2>
        <p style={{ color: theme.colors.neutral[400], fontSize: '14px' }}>
            Run a scan to detect gaps in your repository.
        </p>
    </div>
);

const SettingsView: React.FC = () => (
    <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Settings</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SettingToggle label="Auto-scan on save" />
            <SettingToggle label="Show notifications" />
            <SettingToggle label="Dark mode" defaultChecked />
        </div>
    </div>
);

const StatCard: React.FC<{ label: string; value: string; trend: string }> = ({ label, value, trend }) => (
    <div style={statCardStyle}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.primary[400] }}>
            {value}
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.neutral[500] }}>
            {label}
        </div>
        <div style={{ fontSize: '11px', color: trend.startsWith('+') ? theme.colors.success : theme.colors.error }}>
            {trend}
        </div>
    </div>
);

const SettingToggle: React.FC<{ label: string; defaultChecked?: boolean }> = ({ label, defaultChecked }) => {
    const [checked, setChecked] = React.useState(defaultChecked || false);
    return (
        <label style={toggleLabelStyle}>
            <input 
                type="checkbox" 
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                style={toggleInputStyle}
            />
            <span>{label}</span>
        </label>
    );
};

// Styles
const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: theme.colors.neutral[900],
    color: theme.colors.neutral[100],
    fontFamily: theme.fonts.sans,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
};

const headerStyle: React.CSSProperties = {
    ...glassMorphismStyle,
    padding: theme.spacing.md,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};

const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
};

const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    background: `linear-gradient(135deg, ${theme.colors.primary[400]}, ${theme.colors.primary[600]})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
};

const scanButtonStyle: React.CSSProperties = {
    ...glassMorphismStyle,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: `all ${theme.animations.duration.normal} ${theme.animations.easing.easeOut}`,
};

const spinnerStyle: React.CSSProperties = {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
};

const tabContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: theme.spacing.xs,
};

const tabButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: theme.spacing.sm,
    background: 'transparent',
    border: `1px solid ${theme.glass.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.neutral[400],
    cursor: 'pointer',
    fontSize: '13px',
    transition: `all ${theme.animations.duration.fast} ${theme.animations.easing.easeOut}`,
};

const activeTabStyle: React.CSSProperties = {
    ...glassMorphismStyle,
    color: theme.colors.primary[400],
    borderColor: theme.colors.primary[600],
};

const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
};

const cardStyle: React.CSSProperties = {
    ...glassMorphismStyle,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
};

const sectionTitleStyle: React.CSSProperties = {
    margin: `0 0 ${theme.spacing.md} 0`,
    fontSize: '16px',
    fontWeight: 600,
    color: theme.colors.neutral[200],
};

const statGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing.sm,
};

const statCardStyle: React.CSSProperties = {
    ...glassMorphismStyle,
    padding: theme.spacing.md,
    textAlign: 'center',
};

const toggleLabelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    cursor: 'pointer',
    fontSize: '14px',
};

const toggleInputStyle: React.CSSProperties = {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
};
