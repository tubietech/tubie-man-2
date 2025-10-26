# Phaser Vite React Game

This project is a template for building a game using Phaser 3, Vite, React, and TypeScript. It provides a basic structure to get started with game development in a modern web environment.

## Project Structure

```
phaser-vite-react-game
├── index.html          # Main HTML file
├── package.json        # NPM configuration file
├── tsconfig.json       # TypeScript configuration file
├── vite.config.ts      # Vite configuration file
├── .eslintrc.cjs       # ESLint configuration file
├── .eslintignore       # ESLint ignore file
├── .gitignore          # Git ignore file
├── README.md           # Project documentation
├── public              # Directory for static assets
├── src                 # Source code directory
│   ├── main.tsx        # Entry point for the React application
│   ├── App.tsx         # Main application component
│   ├── phaser          # Phaser game related files
│   │   ├── Game.ts     # Game initialization
│   │   └── config.ts   # Game configuration
│   ├── scenes          # Game scenes
│   │   ├── BootScene.ts # Scene for loading assets
│   │   └── MainScene.ts # Main game logic scene
│   ├── components      # React components
│   │   └── GameCanvas.tsx # Component for rendering the game canvas
│   ├── assets          # Directory for game assets
│   ├── styles          # Directory for styles
│   │   └── main.scss   # Main SCSS styles
│   └── types           # TypeScript types
│       └── index.d.ts  # Type declarations
```

## Getting Started

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd phaser-vite-react-game
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Run the development server:**
   ```
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000` to see your game in action.

## Building for Production

To build the project for production, run:
```
npm run build
```

This will create a `dist` directory with the production-ready files.

## ESLint

To lint your code, you can run:
```
npm run lint
```

## License

This project is licensed under the MIT License.