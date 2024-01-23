"use client";
import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { CheckCircle2Icon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  importerDto: ImporterDto;
};

const SidebarMenu = ({ importerDto }: Props) => {
  const pathname = usePathname();
  const currentStep = pathname.split("/").pop();
  return (
    <nav className="h-full bg-blue-500 w-3/12 text-white">
      <div className="p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={importerDto.config.logo} alt="" />
      </div>
      <div className="p-4 w-full">
        <h1 className="text-2xl font-extrabold tracking-tight break-words">
          {importerDto.config.name}
        </h1>
        <p className="leading-snug mt-3">{importerDto.config.description}</p>
      </div>
      <div className="mt-8">
        <ol role="list" className="px-4 space-y-2">
          <MenuStep
            text="Select file"
            isCurrent={currentStep === "import"}
            href={null}
            isDone={importerDto.status.isWaitingForFile === false}
          />
          {/* TODO add mapping state to importer status */}
          <MenuStep
            text="Mapping"
            isCurrent={currentStep === "mapping"}
            href="mapping"
            isDone={false}
          />
          <MenuStep
            text="Validation"
            isCurrent={currentStep === "validation"}
            href={null}
            isDone={importerDto.status.isWaitingForImport === false}
          />
        </ol>
      </div>
    </nav>
  );
};

export default SidebarMenu;

const DoneStep = ({ text, href }: { text: string; href: string | null }) => {
  const content = (
    <span className="flex items-start">
      <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
        <CheckCircle2Icon
          className="h-full w-full text-slate-50"
          aria-hidden="true"
        />
      </span>
      <span className="ml-3 text-sm font-medium text-slate-50 group-hover:font-bold">
        {text}
      </span>
    </span>
  );

  if (href === null) {
    return <div>{content}</div>;
  }

  return (
    <Link className="group" href={href}>
      {content}
    </Link>
  );
};

const CurrentStep = ({ text }: { text: string }) => {
  return (
    <div className="flex items-start" aria-current="step">
      <span
        className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        <span className="absolute h-4 w-4 rounded-full bg-slate-50" />
        <span className="relative block h-3 w-3 rounded-full bg-blue-500" />
      </span>
      <span className="ml-3 text-sm font-medium text-white">{text}</span>
    </div>
  );
};

const Step = ({ text }: { text: string }) => {
  return (
    <div className="flex items-start">
      <div
        className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        <div className="h-2 w-2 rounded-full bg-slate-50" />
      </div>
      <p className="ml-3 text-sm font-medium text-slate-50">{text}</p>
    </div>
  );
};

const MenuStep = ({
  text,
  isCurrent,
  isDone,
  href,
}: {
  text: string;
  isCurrent: boolean;
  isDone: boolean;
  href: string | null;
}) => {
  if (isDone) {
    return <DoneStep text={text} href={href} />;
  }
  if (isCurrent) {
    return <CurrentStep text={text} />;
  }
  return <Step text={text} />;
};