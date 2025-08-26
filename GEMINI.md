# Gemini Code Assistant Context

## Project Overview

This is a web application project named "phishing_website_detection-2025.08.24". Based on the file structure and dependencies, it is a single-page application (SPA) built with **Vue 3** and the **Vite** build tool.

The project appears to be a standard Vite-bootstrapped Vue application. The main application entry point is `src/main.js`, which mounts the root component `src/App.vue`. The purpose of the application, as suggested by its name, is likely to detect phishing websites.

## Key Technologies

*   **Framework:** Vue.js 3
*   **Build Tool:** Vite
*   **Package Manager:** npm
*   **Language:** JavaScript

## Building and Running the Project

The following scripts are defined in `package.json`:

*   **Install dependencies:**
    ```sh
    npm install
    ```

*   **Run development server:**
    Starts a hot-reloading development server.
    ```sh
    npm run dev
    ```

*   **Build for production:**
    Compiles and minifies the application for production deployment into the `dist` directory.
    ```sh
    npm run build
    ```

*   **Preview production build:**
    Starts a local server to preview the production build from the `dist` directory.
    ```sh
    npm run preview
    ```

## Development Conventions

*   **Path Aliases:** The project is configured with a path alias in `vite.config.js` and `jsconfig.json`. The alias `@{file_path}` maps to the `src/` directory, so it should be used for imports (e.g., `import MyComponent from '@/components/MyComponent.vue'`).
*   **Component Structure:** Components are located in the `src/components` directory. The root component is `App.vue`.
*   **Styling:** Global styles are defined in `src/assets/main.css`. Component-specific styles are likely defined within the `<style scoped>` section of each `.vue` file.
*   **Static Assets:** Static assets that are part of the application's source code are in `src/assets`. Public assets that should be copied directly to the root of the build output are in the `public` directory.
