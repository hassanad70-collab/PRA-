"use client";

import * as React from "react";
import { Globe, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertCompanyProfileAction, publishCompanyProfileAction } from "@/actions/employer";
import type { Company, CompanyProfile } from "@/types/database";

interface CompanyProfileClientProps {
  company: Company;
  profile: CompanyProfile | null;
  labels: {
    saved: string;
    published: string;
    unpublished: string;
    saveFailed: string;
    aboutLabel: string;
    cultureLabel: string;
    websiteLabel: string;
    hqLabel: string;
    sizeLabel: string;
    foundedLabel: string;
    benefitsLabel: string;
    techStackLabel: string;
    addBenefit: string;
    addTech: string;
    saveBtn: string;
    publishBtn: string;
    unpublishBtn: string;
    previewLabel: string;
  };
}

export function CompanyProfileClient({ company, profile, labels }: CompanyProfileClientProps) {
  const [about, setAbout] = React.useState(profile?.about ?? "");
  const [culture, setCulture] = React.useState(profile?.culture ?? "");
  const [website, setWebsite] = React.useState(profile?.website ?? company.website ?? "");
  const [hq, setHq] = React.useState(profile?.headquarters ?? company.headquarters ?? "");
  const [size, setSize] = React.useState(profile?.company_size ?? company.company_size ?? "");
  const [founded, setFounded] = React.useState<string>(profile?.founded_year?.toString() ?? company.founded_year?.toString() ?? "");
  const [benefits, setBenefits] = React.useState<string[]>(profile?.benefits ?? []);
  const [techStack, setTechStack] = React.useState<string[]>(profile?.tech_stack ?? []);
  const [benefitInput, setBenefitInput] = React.useState("");
  const [techInput, setTechInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [isPublished, setIsPublished] = React.useState(profile?.is_published ?? false);

  function addBenefit() {
    if (!benefitInput.trim()) return;
    setBenefits((prev) => [...prev, benefitInput.trim()]);
    setBenefitInput("");
  }

  function removeBenefit(i: number) {
    setBenefits((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addTech() {
    if (!techInput.trim()) return;
    setTechStack((prev) => [...prev, techInput.trim()]);
    setTechInput("");
  }

  function removeTech(i: number) {
    setTechStack((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await upsertCompanyProfileAction({
        about,
        culture,
        website,
        headquarters: hq,
        company_size: size,
        founded_year: founded ? Number(founded) : null,
        benefits,
        tech_stack: techStack,
      });
      toast.success(labels.saved);
    } catch {
      toast.error(labels.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish() {
    setPublishing(true);
    try {
      const next = !isPublished;
      await publishCompanyProfileAction(next);
      setIsPublished(next);
      toast.success(next ? labels.published : labels.unpublished);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant={isPublished ? "success" : "secondary"}>
            {isPublished ? labels.published : labels.unpublished}
          </Badge>
          {isPublished && company.website && (
            <a
              href={`/companies/${company.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Globe className="h-3 w-3" />
              {labels.previewLabel}
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={publishing} onClick={handleTogglePublish}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : isPublished ? labels.unpublishBtn : labels.publishBtn}
          </Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : labels.saveBtn}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels.aboutLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="min-h-[160px]"
              placeholder={labels.aboutLabel}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels.cultureLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={culture}
              onChange={(e) => setCulture(e.target.value)}
              className="min-h-[160px]"
              placeholder={labels.cultureLabel}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{labels.websiteLabel}</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <Label>{labels.hqLabel}</Label>
            <Input value={hq} onChange={(e) => setHq(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{labels.sizeLabel}</Label>
            <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 50–200" />
          </div>
          <div className="space-y-1.5">
            <Label>{labels.foundedLabel}</Label>
            <Input type="number" value={founded} onChange={(e) => setFounded(e.target.value)} placeholder="e.g. 2015" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels.benefitsLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBenefit(); } }}
                placeholder={labels.addBenefit}
              />
              <Button size="icon" variant="outline" onClick={addBenefit}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {benefits.map((b, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {b}
                  <button onClick={() => removeBenefit(i)} className="ms-1 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels.techStackLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }}
                placeholder={labels.addTech}
              />
              <Button size="icon" variant="outline" onClick={addTech}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {techStack.map((t, i) => (
                <Badge key={i} variant="outline" className="gap-1">
                  {t}
                  <button onClick={() => removeTech(i)} className="ms-1 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
