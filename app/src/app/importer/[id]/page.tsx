import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { CheckCircleIcon } from "lucide-react";
import { Importer } from "./Importer";

type PageProps = {
  params: {
    id: string;
  };
};

// TODO fix styling

const DoneStep = ({ text }: { text: string }) => {
  return (
    <a className="group" href="">
      <span className="flex items-start">
        <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
          <CheckCircleIcon
            className="h-full w-full text-indigo-600 group-hover:text-indigo-800"
            aria-hidden="true"
          />
        </span>
        <span className="ml-3 text-sm font-medium text-gray-500 group-hover:text-gray-900">
          {text}
        </span>
      </span>
    </a>
  );
};

const Step = ({ text }: { text: string }) => {
  return (
    <a href="" className="group">
      <div className="flex items-start">
        <div
          className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <div className="h-2 w-2 rounded-full bg-gray-300 group-hover:bg-gray-400" />
        </div>
        <p className="ml-3 text-sm font-medium text-gray-500 group-hover:text-gray-900">
          {text}
        </p>
      </div>
    </a>
  );
};

const CurrentStep = ({ text }: { text: string }) => {
  return (
    <a href="" className="flex items-start" aria-current="step">
      <span
        className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        <span className="absolute h-4 w-4 rounded-full bg-indigo-200" />
        <span className="relative block h-2 w-2 rounded-full bg-indigo-600" />
      </span>
      <span className="ml-3 text-sm font-medium text-indigo-600">{text}</span>
    </a>
  );
};

export default async function ImporterPage({ params }: PageProps) {
  // TODO get host from env or so
  const host = "http://localhost:3000";
  const importerDto = (await fetch(`${host}/api/importer/${params.id}`, {
    cache: "no-cache",
  }).then((res) => res.json())) as ImporterDto;
  return (
    <section className="h-screen flex">
      <nav className="h-full bg-blue-500 w-1/6 text-white">
        <div className="p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://placehold.co/200x100" alt="" />
        </div>
        <div className="p-4">
          <h1 className="text-2xl font-extrabold tracking-tight whitespace-pre-wrap">
            {importerDto.config.name}
          </h1>
          <p className="leading-snug mt-3">{importerDto.config.description}</p>
        </div>
        <div className="mt-8">
          <ol role="list" className="space-y-6">
            <DoneStep text="test" />
            <CurrentStep text="Select file" />
            <Step text="Mapping" />
            <Step text="Validation" />
            <Step text="Import" />
          </ol>
        </div>
      </nav>
      <main className="h-full flex-1">
        <Importer importerDto={importerDto} />
      </main>
    </section>
  );
}
