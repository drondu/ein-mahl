// Global configuration
const CONFIG = {
    API_URL: 'http://localhost:3000/api',
    DEFAULT_AVATAR: '/uploads/avatars/default.png',
    FALLBACK_AVATAR: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSI3MCIgcj0iNDAiIGZpbGw9IiM3MTgwOTYiLz48cGF0aCBkPSJNMTAwIDEyMGMtMjcuNjE0IDAtNTAgMjIuMzg2LTUwIDUwdjE1aDEwMHYtMTVjMC0yNy42MTQtMjIuMzg2LTUwLTUwLTUweiIgZmlsbD0iIzcxODA5NiIvPjwvc3ZnPg=='
};

// Prevent modifications to the configuration
Object.freeze(CONFIG);

// Export for use in other files
export default CONFIG;
