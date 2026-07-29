-- Allows resumes.parse_status to record "completed_partial": text
-- extraction succeeded but AI structured extraction (email/phone/
-- experience/education/skills) degraded to its fallback. Previously this
-- case was silently recorded as plain "completed", identical to a genuine
-- full success -- which is what let the Resume Health Checklist (reads
-- parsed_data structure) and the ATS score (reads raw_text directly) go out
-- of sync without any visible signal that something had failed.
alter table resumes drop constraint resumes_parse_status_check;
alter table resumes add constraint resumes_parse_status_check
  check (parse_status = any (array['pending', 'processing', 'completed', 'completed_partial', 'failed']));
