import { CircularProgress, LinearProgress } from "@mui/material";
import type { MessageData } from "../../../types/train";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

export default function TrainPhase({ trainingMsg }: { trainingMsg: MessageData | null }) {
    const [time, setTime] = useState<number>(0);
    const { t } = useTranslation();
    
    useEffect(() => {
        const interval = setInterval(() => {
            setTime((prevTime) => prevTime + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
            {trainingMsg ? (
                <div style={{ textAlign: "center" }}>  
                    {trainingMsg.status === "evaluation" ? (
                        <>
                        <p>{t("experiment.evaluating")}:  {trainingMsg.epoch} / {trainingMsg.max}</p>
                        <LinearProgress variant="determinate" value={(trainingMsg.epoch / trainingMsg.max) * 100} style={{ maxWidth: "500px", marginTop: 16 }} />
                        </>
                    ) : (
                        <>
                        <p>{t("experiment.epoch")}: {trainingMsg.epoch} / {trainingMsg.max}</p>
                        <p>{t("experiment.loss")}: {trainingMsg.loss.toFixed(4)}</p>
                        <p>{t("experiment.timeElapsed")}: {Math.floor(time/60).toFixed(0)}:{(time%60).toFixed(0).padStart(2, '0')}</p>
                        {trainingMsg.eta - time > 0 ? (
                            <p>{t("experiment.timeRemaining")}: {Math.floor((trainingMsg.eta - time)/60).toFixed(0)}:{((trainingMsg.eta - time)%60).toFixed(0).padStart(2, '0')}</p>
                        ) : (
                            <p>{t("experiment.timeRemaining")}: 00:00</p>
                        )}
                        <LinearProgress variant="determinate" value={(trainingMsg.time / trainingMsg.eta) * 100} style={{ maxWidth: "500px", marginTop: 16 }} />
                    </>
                    )}
                </div>
            ) : (
                <CircularProgress />
            )}
        </div>
    );
}
