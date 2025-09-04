# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prompt Tools is a desktop application for managing AI prompts, built with **Tauri 2.x** framework combining **Rust backend** and **TypeScript/Vite frontend**. It provides a local-first approach to storing and organizing prompts with features like versioning, categorization, search, and AI-powered optimization.

## Architecture

### Tech Stack
- **Frontend**: TypeScript + Vite + Vanilla DOM manipulation (no framework)
- **Backend**: Rust + Tauri 2.x + SQLite (via rusqlite)
- **Database**: SQLite with foreign key constraints enabled
- **Package Manager**: pnpm (must use pnpm, not npm)

### Database Schema
The SQLite database (`prompts.db`) contains three main tables:
- **prompts**: Core prompt data with metadata (name, source, notes, tags, pinned status)
- **versions**: Version history with semantic versioning (1.0.0 format)
- **settings**: Application settings (e.g., version_cleanup_threshold)

### Key Architectural Patterns
- **Command Pattern**: Rust backend exposes Tauri commands that frontend invokes
- **Local-First Storage**: All data stored locally in app data directory
- **Version Control**: Built-in semantic versioning for prompt evolution
- **Category System**: Tag-based categorization with predefined mappings

## Development Commands

### Development Workflow
```bash
# Install dependencies (MUST use pnpm)
pnpm install

# Development mode (starts both Vite dev server and Tauri)
pnpm tauri:dev

# Build frontend only
pnpm build

# Build complete application
pnpm tauri:build

# Type checking
pnpm typecheck
```

### Build Outputs
- **Development**: Uses Vite dev server on port 1421
- **Production**: Frontend builds to `dist/`, final app bundles to `src-tauri/target/release/bundle/`

## Code Organization

### Frontend Structure (`src/`)
- **main.ts**: Main application entry point with DOM manipulation and event handling
- **styles.css**: All styling (no CSS preprocessor)
- **assets/**: Static assets (SVG icons)

### Backend Structure (`src-tauri/src/`)
- **main.rs**: Tauri application entry point
- **lib.rs**: Tauri command handlers and application logic
- **database.rs**: SQLite database operations and data models

### Key Data Structures
```rust
// Main data models in database.rs
pub struct Prompt {
    pub id: i64,
    pub name: String,
    pub content: String,
    pub tags: Vec<String>,
    pub version: String,
    // ... other fields
}

pub struct Version {
    pub id: i64,
    pub prompt_id: i64,
    pub version: String,
    pub content: String,
    // ... other fields
}
```

## Important Development Patterns

### Frontend-Backend Communication
All backend calls use Tauri's `invoke` function:
```typescript
import { invoke } from '@tauri-apps/api/core';

// Example: Get all prompts
const prompts = await invoke('get_all_prompts');

// Example: Create new prompt
await invoke('create_prompt', {
    name: 'Prompt Name',
    content: 'Prompt content...',
    tags: ['tag1', 'tag2']
});
```

### Database Connection Pattern
Every Tauri command:
1. Gets app data directory path
2. Creates database connection to `prompts.db`
3. Performs operation through Database struct
4. Returns Result<T, String> for error handling

### Category System
Categories are determined by tag matching using predefined keyword mappings in both:
- `database.rs`: `get_category_counts()` function
- `main.ts`: `handleCategoryClick()` function

**Keep these mappings synchronized when adding new categories.**

## Testing and Quality

### Current State
- No automated tests are currently implemented
- Type checking available via `pnpm typecheck`
- Manual testing required for all features

### Before Committing
1. Run `pnpm typecheck` to ensure TypeScript compliance
2. Test both development and build modes
3. Verify database operations work correctly
4. Check UI responsiveness and functionality

## File Handling and I/O

### Import/Export Features
- **Export**: Uses Tauri dialog plugin to save JSON files
- **Import**: File picker for JSON with data validation
- **Format**: Custom JSON structure with prompts, versions, and settings

### Database Location
- **Development**: `~/.local/share/com.jwangkun.prompt-tools/prompts.db` (Linux)
- **Production**: Platform-specific app data directory

## UI Architecture

### No Framework Approach
The frontend uses vanilla TypeScript with direct DOM manipulation:
- Event delegation for dynamic content
- Manual state management in global variables
- Direct HTML string generation for dynamic content

### Key UI Components
- **Prompt Cards**: Grid/list view toggle
- **Search/Filter**: Real-time filtering with category navigation
- **Modal System**: Custom modal implementation for forms and details
- **Theme System**: Light/dark theme with localStorage persistence

## External Integrations

### AI Optimization Feature
The application includes integration with Zhipu AI API for prompt optimization:
- API endpoint: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- Model: `glm-4.5-flash`
- **Note**: API key is currently hardcoded - should be moved to settings

## Common Debugging Tips

### Database Issues
- Check if `prompts.db` exists in app data directory
- Verify foreign key constraints are enabled
- Use database initialization logs to debug startup

### Frontend Issues
- Check browser console for JavaScript errors
- Verify Tauri command names match between frontend and backend
- Ensure proper error handling in async operations

### Build Issues
- Always use `pnpm` not `npm`
- Ensure Rust toolchain is properly installed
- Check Tauri prerequisites are met for target platform

## Deployment Notes

### Current Support
- **Primary**: macOS (Apple Silicon)
- **Planned**: Windows and Linux support

### Build Configuration
- Icons provided for all platforms in `src-tauri/icons/`
- Bundle configuration in `src-tauri/tauri.conf.json`
- Minimum window size: 800x600, default: 1200x800