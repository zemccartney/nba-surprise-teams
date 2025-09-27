import type { ClassValue } from "clsx";
import type { ReactNode } from "react";

import * as RadixPopover from "@radix-ui/react-popover";
import Clsx from "clsx";

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
    return (
      <div
        className={Clsx([
          "shadow-popover bg-blurple-glow z-10 w-fit max-w-80 p-7 font-mono text-xl text-green-200",
          className,
        ])}
      >
        {children}
      </div>
    );
  }

  return (
    <RadixPopover.Content
      avoidCollisions
      className={Clsx([
        "shadow-popover bg-blurple-glow z-10 w-fit max-w-80 p-7 font-mono text-xl text-green-200",
        className,
      ])}
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
        className={Clsx([
          "absolute top-0 right-2 cursor-pointer font-mono text-base text-indigo-500 hover:text-indigo-300 md:text-lg",
          classes?.trigger,
        ])}
      >
        ?
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <PopoverBody {...(classes?.body && { className: classes.body })}>
          {children}
          <RadixPopover.Close
            aria-label="Close"
            className={Clsx([
              "shadow-sm:hover absolute top-2 right-4 cursor-pointer font-mono text-2xl text-lime-400 shadow-slate-950 hover:text-lime-600",
              classes?.close,
            ])}
          >
            x
          </RadixPopover.Close>
          <RadixPopover.Arrow
            className={Clsx(["fill-blurple-glow", classes?.arrow])}
          />
        </PopoverBody>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
