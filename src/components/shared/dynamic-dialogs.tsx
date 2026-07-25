import dynamic from "next/dynamic";

/**
 * Each of these dialogs bundles its own always-visible trigger button
 * together with its (larger, only-sometimes-needed) dialog content in one
 * component, so `ssr: false` isn't used here -- that would delay the
 * trigger button itself behind a loading state, a visible behavior change.
 * Code-splitting with SSR left on (the default) keeps the trigger rendering
 * exactly as before while still moving each dialog's content/form code into
 * its own chunk instead of the page's main bundle.
 */
export const ApplyDialog = dynamic(() => import("@/components/candidate/apply-dialog").then((m) => m.ApplyDialog));

export const ImproveResumeDialog = dynamic(() =>
  import("@/components/candidate/improve-resume-dialog").then((m) => m.ImproveResumeDialog)
);

export const AssignCompanyDialog = dynamic(() =>
  import("@/components/admin/assign-company-dialog").then((m) => m.AssignCompanyDialog)
);

export const ChangeRoleDialog = dynamic(() =>
  import("@/components/admin/change-role-dialog").then((m) => m.ChangeRoleDialog)
);
