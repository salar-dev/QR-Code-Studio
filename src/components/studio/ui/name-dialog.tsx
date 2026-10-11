"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";

interface NameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  placeholder?: string;
  initialValue: string;
  submitLabel: string;
  onSubmit: (value: string) => void;
}

export function NameDialog(props: NameDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <NameDialogBody {...props} /> : null}
    </Dialog>
  );
}

function NameDialogBody({ onOpenChange, title, label, placeholder, initialValue, submitLabel, onSubmit }: NameDialogProps) {
  const { m } = useI18n();
  const [value, setValue] = useState(initialValue);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = value.trim();
    if (!name) return;
    onSubmit(name);
    onOpenChange(false);
  };
  return (
    <DialogContent closeLabel={m.common.close}>
      <form onSubmit={submit} className="grid gap-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="name-dialog-input">{label}</Label>
          <Input id="name-dialog-input" value={value} maxLength={60} placeholder={placeholder} dir="auto" autoFocus onChange={(e) => setValue(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {m.common.cancel}
          </Button>
          <Button type="submit" disabled={!value.trim()}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
