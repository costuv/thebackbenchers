const getTheme = () => localStorage.getItem('theme') || 'light';

const setTheme = (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcons(theme);
};

const updateThemeIcons = (theme) => {
    const moonIcons = document.querySelectorAll('.theme-moon');
    const sunIcons = document.querySelectorAll('.theme-sun');
    const mobileToggle = document.getElementById('themeToggleMobile');
    
    if (theme === 'dark') {
        moonIcons.forEach(icon => icon.classList.add('hidden'));
        sunIcons.forEach(icon => icon.classList.remove('hidden'));
        mobileToggle?.classList.remove('hover:bg-gray-100');
        mobileToggle?.classList.add('hover:bg-gray-800');
    } else {
        moonIcons.forEach(icon => icon.classList.remove('hidden'));
        sunIcons.forEach(icon => icon.classList.add('hidden'));
        mobileToggle?.classList.add('hover:bg-gray-100');
        mobileToggle?.classList.remove('hover:bg-gray-800');
    }
};

const toggleTheme = () => {
    const currentTheme = getTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
};

// Initialize theme
document.addEventListener('DOMContentLoaded', () => {
    setTheme(getTheme());
});

export { toggleTheme };
