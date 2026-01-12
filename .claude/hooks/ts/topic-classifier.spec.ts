/**
 * Unit tests for hooks/src/memory/topic-classifier.ts
 */

import { describe, it, expect } from 'vitest';
import {
  isTrivialCommand,
  isMetaTopic,
  isValidTopic,
  extractTopicFromResponse,
  buildTopicPrompt,
  buildSummaryPrompt,
  cleanMemoryContent,
  hasNoGotchas,
  cleanGotchaSummary,
} from '../../../hooks/src/memory/topic-classifier.js';

describe('topic-classifier', () => {
  describe('isTrivialCommand', () => {
    it('should identify trivial commands', () => {
      expect(isTrivialCommand('ls -la')).toBe(true);
      expect(isTrivialCommand('pwd')).toBe(true);
      expect(isTrivialCommand('cd /home')).toBe(true);
      expect(isTrivialCommand('echo "test"')).toBe(true);
      expect(isTrivialCommand('cat file.txt')).toBe(true);
      expect(isTrivialCommand('head -n 10 file')).toBe(true);
      expect(isTrivialCommand('tail -f log')).toBe(true);
      expect(isTrivialCommand('wc -l file')).toBe(true);
      expect(isTrivialCommand('which python')).toBe(true);
      expect(isTrivialCommand('whoami')).toBe(true);
      expect(isTrivialCommand('date')).toBe(true);
      expect(isTrivialCommand('clear')).toBe(true);
      expect(isTrivialCommand('history')).toBe(true);
      expect(isTrivialCommand('env')).toBe(true);
      expect(isTrivialCommand('export PATH=/usr/bin')).toBe(true);
      expect(isTrivialCommand('source ~/.bashrc')).toBe(true);
      expect(isTrivialCommand('alias ll="ls -la"')).toBe(true);
      expect(isTrivialCommand('type python')).toBe(true);
      expect(isTrivialCommand('file test.txt')).toBe(true);
      expect(isTrivialCommand('stat file.txt')).toBe(true);
    });

    it('should identify trivial git commands', () => {
      expect(isTrivialCommand('git status')).toBe(true);
      expect(isTrivialCommand('git log')).toBe(true);
      expect(isTrivialCommand('git diff')).toBe(true);
      expect(isTrivialCommand('git branch')).toBe(true);
      expect(isTrivialCommand('git remote -v')).toBe(true);
      expect(isTrivialCommand('git fetch')).toBe(true);
      expect(isTrivialCommand('git stash list')).toBe(true);
      expect(isTrivialCommand('git show HEAD')).toBe(true);
      expect(isTrivialCommand('git blame file.ts')).toBe(true);
    });

    it('should not identify non-trivial commands as trivial', () => {
      expect(isTrivialCommand('pytest tests/adam/')).toBe(false);
      expect(isTrivialCommand('npm run test')).toBe(false);
      expect(isTrivialCommand('cargo build')).toBe(false);
      expect(isTrivialCommand('docker compose up')).toBe(false);
      expect(isTrivialCommand('git commit -m "test"')).toBe(false);
      expect(isTrivialCommand('git push origin main')).toBe(false);
      expect(isTrivialCommand('rm -rf node_modules')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isTrivialCommand('  ls  ')).toBe(true);
      expect(isTrivialCommand('\tpwd\n')).toBe(true);
    });

    it('should handle empty command', () => {
      expect(isTrivialCommand('')).toBe(false);
      expect(isTrivialCommand('   ')).toBe(false);
    });
  });

  describe('isMetaTopic', () => {
    it('should identify meta-topics', () => {
      expect(isMetaTopic('learning')).toBe(true);
      expect(isMetaTopic('decision')).toBe(true);
      expect(isMetaTopic('artifact')).toBe(true);
      expect(isMetaTopic('gotcha')).toBe(true);
      expect(isMetaTopic('phase')).toBe(true);
      expect(isMetaTopic('impl')).toBe(true);
      expect(isMetaTopic('struct')).toBe(true);
      expect(isMetaTopic('enum')).toBe(true);
      expect(isMetaTopic('trait')).toBe(true);
      expect(isMetaTopic('module')).toBe(true);
    });

    it('should handle case insensitivity', () => {
      expect(isMetaTopic('LEARNING')).toBe(true);
      expect(isMetaTopic('Learning')).toBe(true);
      expect(isMetaTopic('LeArNiNg')).toBe(true);
    });

    it('should not identify valid topics as meta-topics', () => {
      expect(isMetaTopic('testing')).toBe(false);
      expect(isMetaTopic('parser')).toBe(false);
      expect(isMetaTopic('database')).toBe(false);
      expect(isMetaTopic('build')).toBe(false);
    });
  });

  describe('isValidTopic', () => {
    it('should accept valid topics', () => {
      expect(isValidTopic('adam')).toBe(true);
      expect(isValidTopic('parser')).toBe(true);
      expect(isValidTopic('testing')).toBe(true);
      expect(isValidTopic('database')).toBe(true);
      expect(isValidTopic('build')).toBe(true);
      expect(isValidTopic('deploy')).toBe(true);
    });

    it('should reject topics with non-letters', () => {
      expect(isValidTopic('test-123')).toBe(false);
      expect(isValidTopic('test_case')).toBe(false);
      expect(isValidTopic('test.js')).toBe(false);
      expect(isValidTopic('test123')).toBe(false);
      expect(isValidTopic('test-case')).toBe(false);
    });

    it('should reject topics outside length range', () => {
      expect(isValidTopic('ab')).toBe(false); // Too short
      expect(isValidTopic('a'.repeat(16))).toBe(false); // Too long
      expect(isValidTopic('abc')).toBe(true); // Minimum
      expect(isValidTopic('a'.repeat(15))).toBe(true); // Maximum
    });

    it('should reject meta-topics', () => {
      expect(isValidTopic('learning')).toBe(false);
      expect(isValidTopic('decision')).toBe(false);
      expect(isValidTopic('gotcha')).toBe(false);
    });

    it('should handle case normalization', () => {
      expect(isValidTopic('Parser')).toBe(true);
      expect(isValidTopic('TESTING')).toBe(true);
    });

    it('should reject empty or whitespace', () => {
      expect(isValidTopic('')).toBe(false);
      expect(isValidTopic('   ')).toBe(false);
    });
  });

  describe('extractTopicFromResponse', () => {
    it('should extract topic from CHECK response', () => {
      expect(extractTopicFromResponse('CHECK: parser')).toBe('parser');
      expect(extractTopicFromResponse('CHECK: testing')).toBe('testing');
      expect(extractTopicFromResponse('CHECK: database')).toBe('database');
    });

    it('should return null for SKIP response', () => {
      expect(extractTopicFromResponse('SKIP: generic command')).toBeNull();
      expect(extractTopicFromResponse('SKIP: cleanup')).toBeNull();
    });

    it('should handle whitespace in response', () => {
      expect(extractTopicFromResponse('CHECK:   parser  ')).toBe('parser');
      expect(extractTopicFromResponse('  CHECK: testing  ')).toBe('testing');
    });

    it('should normalize topic to lowercase', () => {
      expect(extractTopicFromResponse('CHECK: Parser')).toBe('parser');
      expect(extractTopicFromResponse('CHECK: TESTING')).toBe('testing');
    });

    it('should strip non-letter characters', () => {
      expect(extractTopicFromResponse('CHECK: test123')).toBe('test');
      expect(extractTopicFromResponse('CHECK: test-case')).toBe('test'); // regex stops at hyphen
    });

    it('should return null for invalid topics', () => {
      expect(extractTopicFromResponse('CHECK: ab')).toBeNull(); // Too short
      expect(extractTopicFromResponse('CHECK: learning')).toBeNull(); // Meta-topic
      expect(extractTopicFromResponse('CHECK: ' + 'a'.repeat(20))).toBeNull(); // Too long
    });

    it('should return null for malformed response', () => {
      expect(extractTopicFromResponse('INVALID: parser')).toBeNull();
      expect(extractTopicFromResponse('parser')).toBeNull();
      expect(extractTopicFromResponse('')).toBeNull();
    });

    it('should handle response with extra content', () => {
      expect(
        extractTopicFromResponse('CHECK: parser\nAdditional info here')
      ).toBe('parser');
    });
  });

  describe('buildTopicPrompt', () => {
    it('should include command in prompt', () => {
      const prompt = buildTopicPrompt('pytest tests/adam/');

      expect(prompt).toContain('pytest tests/adam/');
    });

    it('should include rules and examples', () => {
      const prompt = buildTopicPrompt('npm test');

      expect(prompt).toContain('CHECK');
      expect(prompt).toContain('SKIP');
      expect(prompt).toContain('single_word_topic');
      expect(prompt).toContain('Examples:');
    });

    it('should provide good/bad topic examples', () => {
      const prompt = buildTopicPrompt('cargo build');

      expect(prompt).toContain('Good topics:');
      expect(prompt).toContain('Bad topics:');
      expect(prompt).toContain('adam');
      expect(prompt).toContain('parser');
    });
  });

  describe('buildSummaryPrompt', () => {
    it('should include command, topic, and memory content', () => {
      const prompt = buildSummaryPrompt('pytest tests/', 'testing', 'Memory notes here');

      expect(prompt).toContain('pytest tests/');
      expect(prompt).toContain('testing');
      expect(prompt).toContain('Memory notes here');
    });

    it('should include strict rules', () => {
      const prompt = buildSummaryPrompt('npm test', 'testing', 'Notes');

      expect(prompt).toContain('STRICT RULES:');
      expect(prompt).toContain('ONLY explicit warnings');
      expect(prompt).toContain('No gotchas found');
    });

    it('should specify output format', () => {
      const prompt = buildSummaryPrompt('cargo test', 'testing', 'Notes');

      expect(prompt).toContain('OUTPUT FORMAT:');
      expect(prompt).toContain('One bullet per warning');
      expect(prompt).toContain('max 50 words');
    });
  });

  describe('cleanMemoryContent', () => {
    it('should remove status updates', () => {
      const content = '5 tests passing. All tests passed. Zero warnings.';
      const cleaned = cleanMemoryContent(content);

      expect(cleaned).not.toContain('5 tests passing');
      expect(cleaned).not.toContain('All tests passed');
      expect(cleaned).not.toContain('Zero warnings');
    });

    it('should remove clippy references', () => {
      const content = 'Zero clippy warnings. Clippy clean. No clippy warnings.';
      const cleaned = cleanMemoryContent(content);

      expect(cleaned).not.toContain('clippy warnings');
      expect(cleaned).not.toContain('Clippy clean');
    });

    it('should remove build status', () => {
      const content = 'Build succeeded. Build succeeds.';
      const cleaned = cleanMemoryContent(content);

      expect(cleaned).not.toContain('Build succeeded');
      expect(cleaned).not.toContain('Build succeeds');
    });

    it('should limit to 2000 characters', () => {
      const content = 'a'.repeat(5000);
      const cleaned = cleanMemoryContent(content);

      expect(cleaned.length).toBe(2000);
    });

    it('should preserve actual warnings', () => {
      const content = 'Warning: Do not use deprecated API. 3 tests passing.';
      const cleaned = cleanMemoryContent(content);

      expect(cleaned).toContain('Warning: Do not use deprecated API');
      expect(cleaned).not.toContain('3 tests passing');
    });

    it('should handle empty content', () => {
      expect(cleanMemoryContent('')).toBe('');
    });
  });

  describe('hasNoGotchas', () => {
    it('should return true for "no gotchas" messages', () => {
      expect(hasNoGotchas('No gotchas found')).toBe(true);
      expect(hasNoGotchas('no gotchas')).toBe(true);
      expect(hasNoGotchas('NO GOTCHAS')).toBe(true);
    });

    it('should return true for empty or null', () => {
      expect(hasNoGotchas('')).toBe(true);
      expect(hasNoGotchas(null as any)).toBe(true);
      expect(hasNoGotchas(undefined as any)).toBe(true);
    });

    it('should return false for actual gotchas', () => {
      expect(hasNoGotchas('Warning: API deprecated')).toBe(false);
      expect(hasNoGotchas('Careful with null values')).toBe(false);
    });
  });

  describe('cleanGotchaSummary', () => {
    it('should replace newlines with spaces', () => {
      const summary = 'Line 1\nLine 2\nLine 3';
      const cleaned = cleanGotchaSummary(summary);

      expect(cleaned).toBe('Line 1 Line 2 Line 3');
      expect(cleaned).not.toContain('\n');
    });

    it('should collapse multiple spaces', () => {
      const summary = 'Word1    Word2     Word3';
      const cleaned = cleanGotchaSummary(summary);

      expect(cleaned).toBe('Word1 Word2 Word3');
    });

    it('should trim whitespace', () => {
      const summary = '  Summary text  ';
      const cleaned = cleanGotchaSummary(summary);

      expect(cleaned).toBe('Summary text');
    });

    it('should limit to 500 characters', () => {
      const summary = 'a'.repeat(1000);
      const cleaned = cleanGotchaSummary(summary);

      expect(cleaned.length).toBe(500);
    });

    it('should handle tabs and other whitespace', () => {
      const summary = 'Word1\tWord2\r\nWord3';
      const cleaned = cleanGotchaSummary(summary);

      expect(cleaned).toBe('Word1 Word2 Word3');
    });

    it('should handle empty string', () => {
      expect(cleanGotchaSummary('')).toBe('');
    });

    it('should preserve single spaces between words', () => {
      const summary = 'This is a test';
      const cleaned = cleanGotchaSummary(summary);

      expect(cleaned).toBe('This is a test');
    });

    it('should handle complex formatting', () => {
      const summary = '  Line1\n\nLine2  \n  Line3\t\tWord  ';
      const cleaned = cleanGotchaSummary(summary);

      expect(cleaned).toBe('Line1 Line2 Line3 Word');
    });
  });
});
