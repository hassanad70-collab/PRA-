"use client";

import * as React from "react";
import { ResumeUploader } from "./resume-uploader";

interface WorkspaceResumeClientProps {
  currentResumeText: string | null;
  currentFileName?: string | null;
}

export function WorkspaceResumeClient({ currentResumeText, currentFileName }: WorkspaceResumeClientProps) {
  const [resumeText, setResumeText] = React.useState<string | null>(currentResumeText);

  return (
    <ResumeUploader
      currentResumeText={resumeText}
      currentFileName={currentFileName}
      onResumeChange={setResumeText}
    />
  );
}
