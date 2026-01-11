#!/usr/bin/env bash
#
# Claude Memory Plugin - Uninstallation Script
#
# Removes the memory plugin components from ~/.claude/
#

set -e

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No colour

# Paths
CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills"
AGENTS_DIR="$CLAUDE_DIR/agents"
HOOKS_DIR="$CLAUDE_DIR/hooks"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Claude Memory Plugin - Uninstallation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Confirm uninstall
read -p "This will remove the memory plugin. Continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
	echo -e "${YELLOW}Uninstallation cancelled.${NC}"
	exit 0
fi

echo

# Remove skill symlink
echo -e "${YELLOW}Removing memory skill...${NC}"
if [ -L "$SKILLS_DIR/memory" ]; then
	rm "$SKILLS_DIR/memory"
	echo -e "${GREEN}✓ Memory skill symlink removed${NC}"
elif [ -d "$SKILLS_DIR/memory" ]; then
	echo -e "${YELLOW}  Warning: $SKILLS_DIR/memory is not a symlink${NC}"
	echo -e "${YELLOW}  Manual removal required${NC}"
fi

# Remove agents
echo -e "${YELLOW}Removing agents...${NC}"
for agent in memory-recall.md memory-curator.md; do
	if [ -f "$AGENTS_DIR/$agent" ]; then
		rm "$AGENTS_DIR/$agent"
		echo -e "  ${GREEN}✓${NC} $agent"
	fi
done

# Remove hooks (be careful not to remove other hooks)
echo -e "${YELLOW}Removing hooks...${NC}"

# Remove hook library if it only contains our files
if [ -d "$HOOKS_DIR/ts/lib" ]; then
	# Remove specific library files
	for lib_file in error-handler.ts session-state.ts pattern-matcher.ts gotcha-injector.ts relevance-scorer.ts directory-protection.ts fork-detection.ts; do
		if [ -f "$HOOKS_DIR/ts/lib/$lib_file" ]; then
			rm "$HOOKS_DIR/ts/lib/$lib_file"
		fi
	done
	echo -e "  ${GREEN}✓${NC} Hook library files"
fi

# Remove hook directories if they only contain our hooks
for hook_type in pre-tool-use post-tool-use session-start session-end pre-compact; do
	hook_dir="$HOOKS_DIR/ts/$hook_type"
	if [ -d "$hook_dir" ]; then
		# Remove specific hook files
		case $hook_type in
		pre-tool-use)
			rm -f "$hook_dir/protect-memory-directory.ts"
			;;
		post-tool-use)
			rm -f "$hook_dir/memory-context.ts"
			;;
		session-start)
			rm -f "$hook_dir/start-memory-index.ts"
			;;
		session-end)
			rm -f "$hook_dir/memory-cleanup.ts"
			;;
		pre-compact)
			rm -f "$hook_dir/memory-capture.ts"
			;;
		esac
		echo -e "  ${GREEN}✓${NC} $hook_type hooks"
	fi
done

echo
echo -e "${YELLOW}Note: Memory data in .claude/memory/ has NOT been removed.${NC}"
echo -e "${YELLOW}To remove memory data, manually delete:${NC}"
echo -e "  ${BLUE}rm -rf ~/.claude/memory${NC}"
echo -e "  ${BLUE}rm -rf <project>/.claude/memory${NC}"
echo

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Uninstallation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "Remember to update your ~/.claude/settings.json to remove hook configuration."
echo
