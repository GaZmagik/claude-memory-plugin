/**
 * Tests for CLI Response Formatting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  success,
  error,
  formatResponse,
  outputResponse,
  wrapOperation,
  type CliResponse,
} from './response.js';

describe('success', () => {
  it('creates minimal success response', () => {
    const result = success();
    expect(result).toEqual({ status: 'success' });
  });

  it('creates success response with data', () => {
    const result = success({ id: 'test-123', name: 'Test' });
    expect(result).toEqual({
      status: 'success',
      data: { id: 'test-123', name: 'Test' },
    });
  });

  it('creates success response with message', () => {
    const result = success(undefined, 'Operation completed');
    expect(result).toEqual({
      status: 'success',
      message: 'Operation completed',
    });
  });

  it('creates success response with data and message', () => {
    const result = success({ count: 5 }, 'Found 5 memories');
    expect(result).toEqual({
      status: 'success',
      message: 'Found 5 memories',
      data: { count: 5 },
    });
  });

  it('handles null data', () => {
    const result = success(null);
    expect(result).toEqual({
      status: 'success',
      data: null,
    });
  });

  it('handles array data', () => {
    const result = success(['a', 'b', 'c']);
    expect(result).toEqual({
      status: 'success',
      data: ['a', 'b', 'c'],
    });
  });
});

describe('error', () => {
  it('creates error response from string', () => {
    const result = error('Something went wrong');
    expect(result).toEqual({
      status: 'error',
      error: 'Something went wrong',
    });
  });

  it('creates error response from Error object', () => {
    const result = error(new Error('Connection failed'));
    expect(result).toEqual({
      status: 'error',
      error: 'Connection failed',
    });
  });

  it('creates error response with message', () => {
    const result = error('Not found', 'Memory lookup failed');
    expect(result).toEqual({
      status: 'error',
      error: 'Not found',
      message: 'Memory lookup failed',
    });
  });

  it('extracts message from Error with custom message', () => {
    const err = new Error('File not found');
    const result = error(err, 'Read operation failed');
    expect(result.error).toBe('File not found');
    expect(result.message).toBe('Read operation failed');
  });
});

describe('formatResponse', () => {
  it('formats response as pretty JSON by default', () => {
    const response: CliResponse = { status: 'success', data: { id: 'test' } };
    const result = formatResponse(response);
    expect(result).toBe('{\n  "status": "success",\n  "data": {\n    "id": "test"\n  }\n}');
  });

  it('formats response as compact JSON when pretty=false', () => {
    const response: CliResponse = { status: 'success', data: { id: 'test' } };
    const result = formatResponse(response, false);
    expect(result).toBe('{"status":"success","data":{"id":"test"}}');
  });

  it('formats error response', () => {
    const response: CliResponse = { status: 'error', error: 'Failed' };
    const result = formatResponse(response, false);
    expect(result).toBe('{"status":"error","error":"Failed"}');
  });
});

describe('outputResponse', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('outputs success response and returns 0', () => {
    const response: CliResponse = { status: 'success', data: { id: 'test' } };
    const exitCode = outputResponse(response);

    expect(exitCode).toBe(0);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"status": "success"'));
  });

  it('outputs error response and returns 1', () => {
    const response: CliResponse = { status: 'error', error: 'Failed' };
    const exitCode = outputResponse(response);

    expect(exitCode).toBe(1);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"status": "error"'));
  });
});

describe('wrapOperation', () => {
  it('wraps successful async operation', async () => {
    const operation = async () => ({ id: 'test', value: 42 });
    const result = await wrapOperation(operation);

    expect(result.status).toBe('success');
    expect(result.data).toEqual({ id: 'test', value: 42 });
  });

  it('wraps successful operation with message', async () => {
    const operation = async () => ['a', 'b', 'c'];
    const result = await wrapOperation(operation, 'Found 3 items');

    expect(result.status).toBe('success');
    expect(result.data).toEqual(['a', 'b', 'c']);
    expect(result.message).toBe('Found 3 items');
  });

  it('wraps failed operation with Error', async () => {
    const operation = async () => {
      throw new Error('Database connection failed');
    };
    const result = await wrapOperation(operation);

    expect(result.status).toBe('error');
    expect(result.error).toBe('Database connection failed');
  });

  it('wraps failed operation with string error', async () => {
    const operation = async () => {
      throw 'Something went wrong';
    };
    const result = await wrapOperation(operation);

    expect(result.status).toBe('error');
    expect(result.error).toBe('Something went wrong');
  });

  it('wraps operation returning undefined', async () => {
    const operation = async () => undefined;
    const result = await wrapOperation(operation);

    expect(result.status).toBe('success');
    expect(result.data).toBeUndefined();
  });

  it('wraps operation returning null', async () => {
    const operation = async () => null;
    const result = await wrapOperation(operation);

    expect(result.status).toBe('success');
    expect(result.data).toBeNull();
  });
});
