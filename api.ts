// This file acts as a client-side bridge to the backend API.
// It allows the rest of the application to interact with the backend
// without needing to know the implementation details (e.g., Firebase, localStorage).

// Re-export all functions from the actual backend implementation.
export * from './backend/api';
