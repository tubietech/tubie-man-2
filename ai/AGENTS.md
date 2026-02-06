# Tubie-Man Game - AI Agent Guidelines

## Project Overview

Tubie-Man is a Pac-Man-inspired arcade game built with Phaser 3, Vite, React, and TypeScript. The game features a medical/feeding tube theme where the player (Tubie Man) navigates procedurally-generated mazes while collecting pellets and avoiding enemy syringes.

## Coding Conventions and style
- When creating if statements with a single line of logic in the body, do not use  { }
- Prefer modular, re-usable components with low coupling to allow for files and functionality to be easily modified and replaced
- Store all 'magic' numbers and references in config files so that the game is easy
to configure and tweak difficulty
- Enums and types should be created in their own files in the /enums and /types directories.

## Tech Stack

- **Game Engine**: Phaser 3.60+
- **Build Tool**: Vite 7.x
- **UI Framework**: React 18 (wrapper component only)
- **Language**: TypeScript 5.3+
- **Plugins**: phaser3-rex-plugins (BBCodeText for rich text)
- **Font**: PressStart2P (pixel/retro style)

## Key Architectural Patterns

### Singletons
- `AudioManager` - All audio playback and muting
- `SettingsManager` - User preferences and key bindings
- `LocalizationManager` - Language/translation handling
- `DeveloperMode` - Debug feature toggling
- `PerformanceMonitor` - FPS tracking

### Settings Persistence
All user settings are stored in `localStorage`:
- Key bindings (keyboard and controller)
- Audio volume levels and mute states
- Arcade mode toggle
- Language preference

### UI Component Hierarchy
```
UIElement (base)
├── UIText
├── UISprite
├── UISpriteGroup
├── UIButton
├── UIButtonGroup
├── UIScrollableTextBlock
├── UITabGroup
└── UISetting (base for settings)
    ├── UIToggleSetting
    ├── UISliderSetting
    ├── UIKeyBindingSetting
    └── UIControllerBindingSetting
```

### Menu System
- `Menu` - Abstract base class with keyboard navigation, focus management
- Menus use a stack-based navigation pattern in `MenuScene`
- No gamepad navigation in menus (keyboard/mouse only)

## Configuration

All game tuning values are centralized in `src/config/gameConfig.ts`:
- Player/enemy speeds by difficulty
- Scoring values
- Map dimensions
- Color palette
- Control mappings
- Audio track/effect keys

## Localization

Four languages supported: English, Spanish, French, German.
- Translations in `src/config/localization/languageFiles.ts`
- All UI strings use localization keys via `LocalizationManager.getText()`
- When adding new strings, add to ALL four language sections

## Audio System

AudioManager handles:
- Background music tracks (menu, game, getReady)
- Sound effects (one-shot and looping)
- Master/music/SFX volume controls
- Mute toggles
- Browser autoplay policy handling

Audio files: `public/assets/audio/`

## Constraints and Guidelines

### Code Style
1. **TypeScript strict mode** - Use proper types, avoid `any`
2. **No magic numbers** - Use `gameConfig` for all tunable values
3. **Singleton access** - Use `.getInstance()` pattern
4. **Phaser conventions** - Use scene lifecycle methods properly

### When Adding Features
1. **Localization**: Add ALL languages when adding new UI strings
2. **Settings**: Add to `IGameSettings` interface, `getDefaultSettings()`, `mergeWithDefaults()`, and create getter/setter methods
3. **Audio**: Register in `gameConfig.audio.tracks` or `gameConfig.audio.effects`, load in `PreloadScene`
4. **UI Components**: Follow existing UIElement/UISetting patterns

### Menu Navigation
- Keyboard navigation is handled in `Menu.ts` base class
- Arrow keys + custom WASD bindings from settings
- Tab key cycles through navigable items
- Enter/Space confirms selection
- Escape goes back
- **Gamepad not supported in menus** (only in GameScene)

### Common Gotchas
1. **Container coordinates**: Use `getWorldTransformMatrix()` for proper coordinate conversion in nested containers
2. **Audio autoplay**: Must handle browser restrictions - AudioManager queues tracks until user interaction
3. **Scene restarts**: Clean up event listeners and timers in `shutdown()`
4. **Phaser key capture**: Call `addCapture()` to prevent browser handling of Tab, Space, etc.

### Testing Considerations
- Developer mode enabled via Konami code (up up down down left right left right B A)
- Dev keys: Q (toggle AI), Z (clear pellets), K (kill player), P (powerup), R (reload)
- `!` (Shift+1) clears high scores for current difficulty

## File Naming Conventions
- PascalCase for classes: `AudioManager.ts`, `GameScene.ts`
- camelCase for utilities: `utils.ts`, `renderUtils.ts`
- Interfaces prefixed with `I`: `IMapData.ts`, `IGameSettings`
- Enums in own files: `Difficulty.ts`, `Direction.ts`

## Dependencies on External Assets
- Sprite atlas: `public/assets/sprites/atlas.png` + `atlas.json`
- Font: `public/assets/fonts/PressStart2P.ttf`
- Audio: `public/assets/audio/*.mp3`
