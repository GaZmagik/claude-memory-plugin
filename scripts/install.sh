#!/usr/bin/env bash
#
# Claude Memory Plugin - Installation Script
#
# Installs the memory plugin components to ~/.claude/
#

set -e

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No colour

# Paths
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills"
AGENTS_DIR="$CLAUDE_DIR/agents"
HOOKS_DIR="$CLAUDE_DIR/hooks"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Claude Memory Plugin - Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v bun &>/dev/null; then
	echo -e "${RED}Error: bun is not installed.${NC}"
	echo "Install bun from: https://bun.sh"
	exit 1
fi

if [ ! -d "$CLAUDE_DIR" ]; then
	echo -e "${YELLOW}Creating ~/.claude directory...${NC}"
	mkdir -p "$CLAUDE_DIR"
fi

echo -e "${GREEN}✓ Prerequisites satisfied${NC}"
echo

# Install skill
echo -e "${YELLOW}Installing memory skill...${NC}"
mkdir -p "$SKILLS_DIR"

if [ -d "$SKILLS_DIR/memory" ]; then
	echo -e "${YELLOW}  Backing up existing memory skill...${NC}"
	mv "$SKILLS_DIR/memory" "$SKILLS_DIR/memory.backup.$(date +%Y%m%d%H%M%S)"
fi

# Create symlink to skill
ln -sf "$PLUGIN_DIR/skills/memory" "$SKILLS_DIR/memory"
echo -e "${GREEN}✓ Memory skill installed${NC}"

# Install agents
echo -e "${YELLOW}Installing agents...${NC}"
mkdir -p "$AGENTS_DIR"

for agent_file in "$PLUGIN_DIR/agents"/*.md; do
	if [ -f "$agent_file" ]; then
		agent_name=$(basename "$agent_file")
		cp "$agent_file" "$AGENTS_DIR/$agent_name"
		echo -e "  ${GREEN}✓${NC} $agent_name"
	fi
done

# Install hooks
echo -e "${YELLOW}Installing hooks...${NC}"
mkdir -p "$HOOKS_DIR/ts"

# Copy hook library
if [ -d "$PLUGIN_DIR/hooks/lib" ]; then
	mkdir -p "$HOOKS_DIR/ts/lib"
	cp -r "$PLUGIN_DIR/hooks/lib"/* "$HOOKS_DIR/ts/lib/"
	echo -e "  ${GREEN}✓${NC} Hook library"
fi

# Copy hook types
for hook_type in pre-tool-use post-tool-use session-start session-end pre-compact; do
	if [ -d "$PLUGIN_DIR/hooks/$hook_type" ]; then
		mkdir -p "$HOOKS_DIR/ts/$hook_type"
		cp -r "$PLUGIN_DIR/hooks/$hook_type"/* "$HOOKS_DIR/ts/$hook_type/"
		echo -e "  ${GREEN}✓${NC} $hook_type hooks"
	fi
done

# Update settings.json with hook configuration
echo -e "${YELLOW}Configuring hooks in settings.json...${NC}"

SETTINGS_FILE="$CLAUDE_DIR/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
	# Backup existing settings
	cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup.$(date +%Y%m%d%H%M%S)"
fi

# Note: Hook configuration should be merged manually or via a proper JSON merge
echo -e "${YELLOW}  Note: Review ~/.claude/settings.json to enable hooks${NC}"
echo -e "${YELLOW}  See hooks/hooks.json for hook configuration${NC}"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$PLUGIN_DIR"
bun install --silent
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "Installed components:"
echo -e "  • Memory skill:  ${BLUE}$SKILLS_DIR/memory${NC}"
echo -e "  • Agents:        ${BLUE}$AGENTS_DIR${NC}"
echo -e "  • Hooks:         ${BLUE}$HOOKS_DIR/ts${NC}"
echo
echo -e "To activate the memory skill, add to your CLAUDE.md:"
echo -e "  ${YELLOW}Use the memory skill for project knowledge management${NC}"
echo
echo -e "To test the installation:"
echo -e "  ${BLUE}~/.claude/skills/memory/memory.sh status${NC}"
echo
