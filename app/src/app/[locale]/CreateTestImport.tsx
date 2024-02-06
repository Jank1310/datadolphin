"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

export const CreateTestImporter = () => {
  const [importerId, setImporterId] = React.useState<string | null>(null);

  const createImporter = async () => {
    const fetchResult = await fetch("/api/importer", {
      method: "POST",
      body: JSON.stringify({
        name: "Mitarbeiterdaten upload",
        description:
          "Hier können Sie Ihre Mitarbeiterdaten sicher hochladen und validieren.",
        logo: "https://placehold.co/200x100",
        callbackUrl: "some-url",
        // columnConfig: [
        //   {
        //     key: "email",
        //     label: "E-Mail",
        //     type: "text",
        //     validations: [
        //       {
        //         type: "email",
        //       },
        //       { type: "unique" },
        //     ],
        //   },
        //   {
        //     key: "work role",
        //     keyAlternatives: ["position"],
        //     label: "Role",
        //     type: "text",
        //   },
        //   {
        //     key: "department",
        //     label: "Department",
        //     keyAlternatives: ["abteilung"],
        //     type: "text",
        //     validations: [
        //       {
        //         type: "enum",

        //         values: ["IT", "HR", "Support"],
        //       },
        //     ],
        //   },
        // ],

        columnConfig: [
          // {
          //   key: "email",
          //   label: "E-Mail",
          //   type: "text",
          // },
          // {
          //   key: "work role",
          //   keyAlternatives: ["position"],
          //   label: "Role",
          //   type: "text",
          // },
          {
            key: "BSNR",
            label: "BSNR",
            type: "text",
            validations: [{ type: "required" }, { type: "unique" }],
          },
          {
            key: "Name Kunde",
            label: "Name Kunde",
            type: "text",
            validations: [{ type: "required" }],
          },
          {
            key: "Adresse Kunde",
            label: "Adresse Kunde",
            type: "text",
            validations: [
              {
                type: "email",
              },
              { type: "unique" },
            ],
          },
          {
            key: "PLZ Kunde",
            label: "PLZ Kunde",
            type: "text",
            validations: [{ type: "regex", regex: "^[0-9]{5}$" }],
          },
          {
            key: "Ort Kunde",
            label: "Ort Kunde",
            type: "text",
          },
          {
            key: "department",
            label: "Department",
            keyAlternatives: ["abteilung"],
            type: "text",
            validations: [
              {
                type: "enum",

                values: ["IT", "HR", "Support"],
              },
            ],
          },
        ],
      }),
    });
    const { importerId } = await fetchResult.json();
    setImporterId(importerId);
  };

  return (
    <div>
      {importerId ? (
        <div>
          Importer created: {importerId}.{" "}
          <Link className="text-blue-500" href={`/importer/${importerId}`}>
            Show
          </Link>
        </div>
      ) : (
        <Button onClick={createImporter}>Create test import </Button>
      )}
    </div>
  );
};