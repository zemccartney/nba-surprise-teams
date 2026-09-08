import type { ClassValue } from "clsx";
import type { ReactNode } from "react";

import * as RadixPopover from "@radix-ui/react-popover";
import Clsx from "clsx";

import "./popover.css";

export const PopoverBody = ({
  children,
  className,
  deRadix = false, // utilize same styles on non-radix componentry; was needed for use within recharts, tooltip context incompatibility IIRC
}: {
  children: ReactNode;
  className?: ClassValue;
  deRadix?: boolean;
}) => {
  if (deRadix) {
    return <div className={Clsx(["popover-body", className])}>{children}</div>;
  }

  return (
    <RadixPopover.Content
      avoidCollisions
      className={Clsx(["popover-body", className])}
      hideWhenDetached
    >
      {children}
    </RadixPopover.Content>
  );
};

export default function Popover({
  children,
  classes,
}: {
  children: ReactNode;
  classes?: Partial<Record<"arrow" | "body" | "close" | "trigger", ClassValue>>;
}) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger
        className={Clsx(["popover-trigger", classes?.trigger])}
      >
        ?
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <PopoverBody {...(classes?.body && { className: classes.body })}>
          {children}
          <RadixPopover.Close
            aria-label="Close"
            className={Clsx(["popover-close", classes?.close])}
          >
            x
          </RadixPopover.Close>
          <RadixPopover.Arrow
            className={Clsx(["popover-arrow", classes?.arrow])}
          />
        </PopoverBody>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
