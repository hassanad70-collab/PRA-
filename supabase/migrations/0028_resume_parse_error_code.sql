-- Structured, queryable counterpart to the existing free-text parse_error
-- column. Before this, every AI structured-extraction failure (missing key,
-- invalid key, auth error, rate limit, timeout, network error, malformed
-- response) collapsed into the same generic "completed_partial" status with
-- no machine-readable distinction -- ops had to grep parse_error's free text
-- to tell a missing API key from a transient rate limit. This lets the UI
-- and any future monitoring query WHERE parse_error_code = 'rate_limit'
-- directly instead of string-matching.
alter table resumes add column parse_error_code text;
alter table resumes add constraint resumes_parse_error_code_check
  check (parse_error_code is null or parse_error_code = any (array[
    'missing_api_key',
    'invalid_api_key',
    'authentication_error',
    'rate_limit',
    'timeout',
    'network_error',
    'invalid_json_response',
    'unknown_error'
  ]));
