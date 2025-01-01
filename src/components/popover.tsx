import type { ReactNode } from "react";
import * as RadixPopover from "@radix-ui/react-popover";

export const styles = {
  body: "w-fit max-w-60 z-10 bg-cyan-500 p-2 font-mono text-sm text-slate-950 ring-2 ring-indigo-500",
};

export default function Popover({ children }: { children: ReactNode }) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger className="absolute right-2 top-0 font-mono text-base text-indigo-500 hover:text-indigo-300 md:text-lg">
        ?
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          avoidCollisions
          hideWhenDetached
          className={styles.body}
        >
          {children}
          <RadixPopover.Close
            aria-label="Close"
            className="shadow-sm:hover absolute right-2 top-0 font-mono text-lg text-indigo-500 shadow-slate-950"
          >
            x
          </RadixPopover.Close>
          <RadixPopover.Arrow className="fill-indigo-500" />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
