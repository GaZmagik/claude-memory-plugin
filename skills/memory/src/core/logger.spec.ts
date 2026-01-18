/**
 * Unit tests for logger utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LogLevel,
  setLogLevel,
  getLogLevel,
  debug,
  info,
  warn,
  error,
  createLogger,
} from './logger.js';

describe('Logger', () => {
  let originalLevel: LogLevel;

  beforeEach(() => {
    originalLevel = getLogLevel();
  });

  afterEach(() => {
    setLogLevel(originalLevel);
    vi.restoreAllMocks();
  });

  describe('setLogLevel and getLogLevel', () => {
    it('should set and get log level', () => {
      setLogLevel(LogLevel.DEBUG);
      expect(getLogLevel()).toBe(LogLevel.DEBUG);

      setLogLevel(LogLevel.ERROR);
      expect(getLogLevel()).toBe(LogLevel.ERROR);

      setLogLevel(LogLevel.SILENT);
      expect(getLogLevel()).toBe(LogLevel.SILENT);
    });
  });

  describe('debug', () => {
    it('should log when level is DEBUG', () => {
      setLogLevel(LogLevel.DEBUG);
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      debug('test message');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]![0]).toContain('DEBUG');
      expect(spy.mock.calls[0]![0]).toContain('test message');
    });

    it('should not log when level is higher than DEBUG', () => {
      setLogLevel(LogLevel.INFO);
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      debug('test message');

      expect(spy).not.toHaveBeenCalled();
    });

    it('should include context when provided', () => {
      setLogLevel(LogLevel.DEBUG);
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      debug('test message', { key: 'value' });

      expect(spy.mock.calls[0]![0]).toContain('"key":"value"');
    });
  });

  describe('info', () => {
    it('should log when level is INFO or lower', () => {
      setLogLevel(LogLevel.INFO);
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

      info('info message');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]![0]).toContain('INFO');
    });

    it('should not log when level is WARN or higher', () => {
      setLogLevel(LogLevel.WARN);
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

      info('info message');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log when level is WARN or lower', () => {
      setLogLevel(LogLevel.WARN);
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      warn('warn message');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]![0]).toContain('WARN');
    });

    it('should not log when level is ERROR or higher', () => {
      setLogLevel(LogLevel.ERROR);
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      warn('warn message');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log when level is ERROR or lower', () => {
      setLogLevel(LogLevel.ERROR);
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      error('error message');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]![0]).toContain('ERROR');
    });

    it('should not log when level is SILENT', () => {
      setLogLevel(LogLevel.SILENT);
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      error('error message');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('createLogger', () => {
    it('should create child logger with prefix', () => {
      setLogLevel(LogLevel.DEBUG);
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const logger = createLogger('TestModule');
      logger.debug('child message');

      expect(spy.mock.calls[0]![0]).toContain('[TestModule]');
      expect(spy.mock.calls[0]![0]).toContain('child message');
    });

    it('should support all log methods', () => {
      setLogLevel(LogLevel.DEBUG);
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const logger = createLogger('Test');
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
