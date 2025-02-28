"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
import type {
	ColumnConfig,
	EnumerationColumnValidation,
} from "../api/importer/[slug]/ImporterDto";

const doctorsImporterColumns = [
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
				canAddNewValues: true,
			},
			{
				type: "enum",
				values: ["foo"],
				canAddNewValues: false,
			},
			{
				type: "enum",
				values: ["bar"],
			},
		],
	},
	{
		key: "department2",
		label: "Department",
		keyAlternatives: ["abteilung"],
		type: "text",
		validations: [
			{
				type: "enum",
				values: ["IT", "HR", "Support"],
				canAddNewValues: false,
			},
		],
	},
];

const userImporterColumns: ColumnConfig[] = [
	{
		key: "email",
		label: "E-Mail",
		type: "text",
		validations: [
			{
				type: "email",
			},
			{ type: "unique" },
		],
	},
	{
		key: "work role",
		keyAlternatives: ["position"],
		label: "Role",
		type: "text",
	},
	{
		key: "role",
		type: "text",
		validations: [
			{
				type: "enum",
				values: ["admin", "user"],
				canAddNewValues: true,
			} as EnumerationColumnValidation,
		],
		multipleValues: {
			enabled: true,
		},
		label: "Rolle",
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
				canAddNewValues: true,
			} as EnumerationColumnValidation,
		],
	},
];

export const CreateTestImporter = () => {
	const [importerId, setImporterId] = React.useState<string | null>(null);

	const createImporter = async (columnConfig: ColumnConfig[]) => {
		const fetchResult = await fetch("/api/importer", {
			method: "POST",
			body: JSON.stringify({
				name: "Mitarbeiterdaten upload",
				description:
					"Hier können Sie Ihre Mitarbeiterdaten sicher hochladen und validieren.",
				logo: "https://placehold.co/200x100",
				callbackUrl: "some-url",
				columnConfig,
				design: {
					primaryColor: "#0000FF",
					primaryForegroundColor: "#FFFFFF",
					menuBackgroundColor: "#9CCC65",
					menuForegroundColor: "#FFFFFF",
				},
			}),
			headers: {
				//! ONLY USED FOR DEVELOPMENT
				Authorization: "Bearer " + "some-secret-server-token",
			},
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
				<div className="flex flex-col gap-4">
					<Button
						onClick={() =>
							createImporter(doctorsImporterColumns as ColumnConfig[])
						}
					>
						Create doctors test import{" "}
					</Button>
					<Button onClick={() => createImporter(userImporterColumns)}>
						Create user test import{" "}
					</Button>
				</div>
			)}
		</div>
	);
};
