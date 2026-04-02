import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { SourceId } from "@/lib/types";

interface SourceEntry {
  id: string;
  label: string;
  href: string;
  disabled?: boolean;
}

interface SourceSection {
  label: string;
  items: SourceEntry[];
}

const SECTIONS: SourceSection[] = [
  {
    label: "Federal",
    items: [
      { id: "usc", label: "U.S. Code", href: "/usc" },
      { id: "ecfr", label: "eCFR", href: "/ecfr" },
      { id: "cfr", label: "Annual CFR", href: "#", disabled: true },
      { id: "fr", label: "Federal Register", href: "/fr" },
      { id: "plaw", label: "Public Laws", href: "#", disabled: true },
      { id: "bills", label: "Congressional Bills", href: "#", disabled: true },
    ],
  },
  {
    label: "State",
    items: [{ id: "state", label: "State Statutes", href: "#", disabled: true }],
  },
  {
    label: "Municipal",
    items: [{ id: "municipal", label: "Municipal Code", href: "#", disabled: true }],
  },
];

const ALL_ACTIVE_SOURCES = SECTIONS.flatMap((s) => s.items).filter((i) => !i.disabled);

interface SourcesDropdownProps {
  source?: SourceId;
}

export function SourcesDropdown({ source }: SourcesDropdownProps) {
  const activeLabel = ALL_ACTIVE_SOURCES.find((s) => s.id === source)?.label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "nav-link inline-flex items-center gap-1 transition-colors focus:outline-none",
          "hover:text-slate-blue-700 dark:hover:text-slate-blue-300",
          source ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {activeLabel ?? "Browse"}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {SECTIONS.map((section, si) => (
          <div key={section.label}>
            {si > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-sm text-slate-blue-700 dark:text-slate-blue-300">{section.label}</DropdownMenuLabel>
            <DropdownMenuGroup>
              {section.items.map((item) =>
                item.disabled ? (
                  <DropdownMenuItem key={item.id} disabled className="text-base">
                    {item.label}
                    <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none font-medium text-muted-foreground">
                      Soon
                    </span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem key={item.id} asChild className="text-base text-foreground/75">
                    <a
                      href={item.href}
                      className={cn(
                        "w-full cursor-pointer",
                        source === item.id && "font-medium text-foreground",
                      )}
                    >
                      {item.label}
                    </a>
                  </DropdownMenuItem>
                ),
              )}
            </DropdownMenuGroup>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
