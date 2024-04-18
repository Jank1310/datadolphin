"use client";

import { ImporterDto, SourceData } from "@/app/api/importer/[slug]/ImporterDto";
import { RecordUpdateResult } from "@/app/api/importer/[slug]/records/RecordUpdateResult";
import { FetchRecordsFilter, useFetchRecords } from "@/components/hooks/useFetchRecords";
import { useGetImporter } from "@/components/hooks/useGetImporter";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loadingSpinner";
import { useToast } from "@/components/ui/use-toast";
import { useFrontendFetchWithAuth } from "@/lib/frontendFetch";
import { enableMapSet, produce } from "immer";
import { sum } from "lodash";
import { ChevronRightCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import { useIsMounted } from "usehooks-ts";
import ValidationTable from "./ValidationTable";

enableMapSet();

type Props = {
    initialImporterDto: ImporterDto;
    initialRecords: SourceData[];
};

const Validation = ({ initialImporterDto, initialRecords: initialData }: Props) => {
    const { t } = useTranslation();
    const { push } = useRouter();
    const { toast } = useToast();
    const frontendFetch = useFrontendFetchWithAuth();
    const [enablePolling, setEnablePolling] = React.useState(false);
    const [isStartingImport, setIsStartingImport] = React.useState(false);
    const [isResetting, setIsResetting] = React.useState(false);
    const [currentFilter, setCurrentFilter] = React.useState<FetchRecordsFilter>({});
    const [currentValidations, setCurrentValidations] = React.useState<
        Record<string /* rowId */, Record<string /* columnId */, boolean>>
    >({});
    const isMounted = useIsMounted();
    const { importer, mutate: mutateImporter } = useGetImporter(
        initialImporterDto.importerId,
        enablePolling ? 500 : undefined,
        initialImporterDto
    );
    const totalErrors = React.useMemo(
        () => sum(Object.values(importer.status.meta?.messageCount ?? {})),
        [importer.status.meta?.messageCount]
    );
    const [dataStats, setDataStats] = React.useState({
        total: initialImporterDto.status.totalRows,
        totalErrors,
    });
    const [currentlyLoading, setCurrentlyLoading] = React.useState<Record<string, boolean>>({});
    const [pageData, setPageData] = React.useState<Record<number, SourceData[]>>({
        0: initialData,
    });
    const fetchRecords = useFetchRecords(initialImporterDto.importerId);

    const handleReloadConfig = React.useCallback(async () => {
        mutateImporter();
    }, [mutateImporter]);

    const handleLoadPage = React.useCallback(
        async (pageNumber: number, force: boolean = false, filter: FetchRecordsFilter) => {
            setTimeout(async () => {
                // needed to get the latest states
                if (!force && (currentlyLoading[pageNumber.toFixed()] || pageNumber in pageData)) {
                    return;
                }
                setCurrentlyLoading({
                    ...currentlyLoading,
                    [pageNumber]: true,
                });
                try {
                    const result = (await fetchRecords(pageNumber, 100, filter)) as {
                        recordCount: number;
                        records: SourceData[];
                    };
                    setPageData({
                        ...pageData,
                        [pageNumber]: result.records,
                    });
                    setDataStats({
                        total: result.recordCount,
                        totalErrors,
                    });
                } finally {
                    setCurrentlyLoading({
                        ...currentlyLoading,
                        [pageNumber]: false,
                    });
                }
            });
        },
        [currentlyLoading, fetchRecords, pageData, totalErrors]
    );

    React.useEffect(() => {
        if (initialImporterDto.status.isValidatingData) {
            setEnablePolling(true);
        } else {
            if (enablePolling) {
                handleLoadPage(0, true, currentFilter);
                mutateImporter(); // needed to update stats
                setEnablePolling(false);
            }
        }
    }, [enablePolling, handleLoadPage, initialImporterDto.status.isValidatingData, mutateImporter, currentFilter]);

    const handleRecordUpdate = React.useCallback(
        (
            rowIndex: number,
            rowId: string,
            columnId: string,
            result: RecordUpdateResult,
            newValue: string | number | null
        ) => {
            // update messages
            const rowPage = Math.floor(rowIndex / 100);
            setPageData(
                produce((draft) => {
                    const page = draft[rowPage];
                    const row = page.find((r) => r._id === rowId);
                    if (!row) {
                        throw new Error("row not found: " + rowId);
                    }
                    row.data[columnId].value = newValue;
                    for (const newMessagesColumnId in result.newMessagesByColumn) {
                        row.data[newMessagesColumnId].messages = result.newMessagesByColumn[newMessagesColumnId];
                    }
                })
            );
            mutateImporter();
            if (result.changedColumns.length > 0) {
                handleLoadPage(rowPage, true, currentFilter);
            }
            // reload importer to get latest stats
        },
        [mutateImporter, handleLoadPage, currentFilter]
    );

    const handleUpdateData = React.useCallback(
        async (rowIndex: number, rowId: string, columnId: string, value: string | number | null) => {
            setCurrentValidations(
                produce((draft) => {
                    if (!draft[rowId]) {
                        draft[rowId] = {};
                    }
                    draft[rowId][columnId] = true;
                })
            );
            try {
                const res = await frontendFetch(`/api/importer/${initialImporterDto.importerId}/records`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        _id: rowId,
                        columnId,
                        value,
                    }),
                });
                if (isMounted()) {
                    const result = (await res.json()) as RecordUpdateResult;
                    handleRecordUpdate(rowIndex, rowId, columnId, result, value);
                }
            } finally {
                if (isMounted()) {
                    setCurrentValidations(
                        produce((draft) => {
                            if (!draft[rowId]) {
                                draft[rowId] = {};
                            }
                            draft[rowId][columnId] = false;
                        })
                    );
                }
            }
        },
        [frontendFetch, handleRecordUpdate, initialImporterDto.importerId, isMounted]
    );

    const handleStartImport = React.useCallback(async () => {
        if (totalErrors > 0) {
            return;
        }
        setIsStartingImport(true);
        try {
            await frontendFetch(`/api/importer/${initialImporterDto.importerId}/start-import`, {
                method: "POST",
            });
            push("importing");
        } catch (err) {
            console.error(err);
            toast({
                title: t("validation.toast.errorStartingImport"),
                variant: "destructive",
            });
            if (isMounted()) {
                // only set on error to prevent flickering
                setIsStartingImport(false);
            }
        }
    }, [frontendFetch, initialImporterDto.importerId, isMounted, push, t, toast, totalErrors]);

    const handleUploadDifferentFile = React.useCallback(async () => {
        if (isResetting) {
            return;
        }
        setIsResetting(true);
        try {
            const res = await frontendFetch(`/api/importer/${initialImporterDto.importerId}/reset`, {
                method: "POST",
            });
            setIsResetting(false);
            if (res.ok) {
                return push("select-file");
            } else {
                toast({
                    title: t("validation.toast.errorResetting"),
                    variant: "destructive",
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            if (isMounted()) {
                setIsResetting(false);
            }
        }
    }, [frontendFetch, initialImporterDto.importerId, isMounted, isResetting, push, t, toast]);

    React.useEffect(() => {
        handleLoadPage(0, true, currentFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFilter]);

    const hasErrors = dataStats.totalErrors > 0;

    const toggleErrorsFilter = () => {
        setCurrentFilter(
            produce((draft) => {
                if (draft?.errors) {
                    draft.errors = null;
                } else {
                    draft.errors = "__ALL_COLUMNS__";
                }
                return draft;
            })
        );
    };

    return (
        <div>
            <div className="h-14 flex justify-between items-center px-4">
                <h1 className="text-3xl font-bold">{t("validation.title")}</h1>
                <div className="flex gap-2">
                    <Button disabled={isResetting} variant="secondary" onClick={toggleErrorsFilter}>
                        {t(currentFilter?.errors ? "validation.btnShowAll" : "validation.btnShowOnlyErrors")}
                    </Button>
                    <Button disabled={isResetting} variant="secondary" onClick={handleUploadDifferentFile}>
                        {t("validation.btnUploadDifferentFile")}
                    </Button>
                    <Button disabled={hasErrors || isStartingImport} onClick={handleStartImport}>
                        {t("validation.btnConfirmData")}
                        {isStartingImport ? (
                            <LoadingSpinner className="ml-2" />
                        ) : (
                            <ChevronRightCircleIcon className="ml-2" />
                        )}
                    </Button>
                </div>
            </div>
            <div className="px-4">
                <ValidationTable
                    importerDto={importer}
                    data={pageData}
                    totalRows={dataStats.total}
                    onUpdateData={handleUpdateData}
                    onLoadPage={(page, force) => handleLoadPage(page, force, currentFilter)}
                    currentValidations={currentValidations}
                    onReloadConfig={handleReloadConfig}
                    onFilterErrorsForColumn={(column: string) => {
                        console.log(column);
                        setCurrentFilter(
                            produce((draft) => {
                                draft.errors = column;
                            })
                        );
                    }}
                />
            </div>
        </div>
    );
};

export default Validation;
