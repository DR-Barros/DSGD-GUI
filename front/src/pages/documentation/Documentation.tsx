import { useTranslation } from "react-i18next";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorIcon from "@mui/icons-material/Error";
import { Link } from "react-router-dom";

export default function Documentation() {
    const { t } = useTranslation();

    return (
        <>
        <Box sx={{
            maxWidth: 1200,
            backgroundColor: "#f9f9f9",
            padding: 3,
            borderRadius: 2,
            boxShadow: 3,
            margin: "20px auto"
        }}>
        <Typography variant="h4" gutterBottom>
            {t("modelDocumentation.title")}
        </Typography>
        <Card>
            <CardContent>
            <Typography variant="h6">{t("modelDocumentation.DSGD.title")}</Typography>
            <Typography sx={{ mb: 2 }}>{t("modelDocumentation.DSGD.description")}</Typography>
            <Typography variant="h6">{t("modelDocumentation.DSGD.keyConcepts.title")}</Typography>
            <ul>
                <li><strong>{t("modelDocumentation.DSGD.keyConcepts.massAssignmentTitle")}</strong> {t("modelDocumentation.DSGD.keyConcepts.massAssignment")}</li>
                <li><strong>{t("modelDocumentation.DSGD.keyConcepts.beliefAndPlausibilityTitle")}</strong> {t("modelDocumentation.DSGD.keyConcepts.beliefAndPlausibility")}</li>
                <li><strong>{t("modelDocumentation.DSGD.keyConcepts.dempsterRuleTitle")}</strong> {t("modelDocumentation.DSGD.keyConcepts.dempsterRule")}</li>
                <li><strong>{t("modelDocumentation.DSGD.keyConcepts.rulesTitle")}</strong> {t("modelDocumentation.DSGD.keyConcepts.rules")}</li>
                <li><strong>{t("modelDocumentation.DSGD.keyConcepts.ruleGenerationTitle")}</strong> {t("modelDocumentation.DSGD.keyConcepts.ruleGeneration")}</li>
                <li><strong>{t("modelDocumentation.DSGD.keyConcepts.predictionTitle")}</strong> {t("modelDocumentation.DSGD.keyConcepts.prediction")}</li>
            </ul>
            <Typography variant="h6">{t("modelDocumentation.DSGD.link")}</Typography>
            <a href="https://github.com/Sergio-P/DSGD" target="_blank" rel="noopener noreferrer">
                {t("modelDocumentation.DSGD.linkTitle")}
            </a>
        </CardContent>
        </Card>
        </Box>
        <Box sx={{
            maxWidth: 1200,
            backgroundColor: "#f9f9f9",
            padding: 3,
            borderRadius: 2,
            boxShadow: 3,
            margin: "20px auto"
        }}>
        <Typography variant="h4" gutterBottom>
            {t("datasetsDocumentation.title")}
        </Typography>
        <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
            {t("datasetsDocumentation.introduction")}
        </Typography>
        <Card sx={{ mb: 3 }}>
            <CardContent>
            <Typography variant="h6">{t("datasetsDocumentation.supportedFormats.title")}</Typography>
            <ul>
                <li>{t("datasetsDocumentation.supportedFormats.csv")}</li>
                <li>{t("datasetsDocumentation.supportedFormats.excel")}</li>
            </ul>
            </CardContent>
        </Card>
        <Card sx={{ mb: 3 }}>
            <CardContent>
            <Typography variant="h6">{t("datasetsDocumentation.uploadingDatasets.title")}</Typography>
            <Typography>{t("datasetsDocumentation.uploadingDatasets.description")}</Typography>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>{t("datasetsDocumentation.uploadingDatasets.singleFile.title")}</Typography>
            <Typography>{t("datasetsDocumentation.uploadingDatasets.singleFile.description")}</Typography>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>{t("datasetsDocumentation.uploadingDatasets.multipleFiles.title")}</Typography>
            <Typography>{t("datasetsDocumentation.uploadingDatasets.multipleFiles.description")}</Typography>
            <Typography variant="h6" sx={{marginTop: 2}}><strong>{t("datasetsDocumentation.uploadingDatasets.instructions.title")}</strong></Typography>
            <ol>
                <li>{t("datasetsDocumentation.uploadingDatasets.instructions.step1")}</li>
                <li>{t("datasetsDocumentation.uploadingDatasets.instructions.step2")}</li>
                <li>{t("datasetsDocumentation.uploadingDatasets.instructions.step3")}</li>
                <li>{t("datasetsDocumentation.uploadingDatasets.instructions.step4")}</li>
                <li>{t("datasetsDocumentation.uploadingDatasets.instructions.step5")}</li>
                <li>{t("datasetsDocumentation.uploadingDatasets.instructions.step6")}</li>
                <li>{t("datasetsDocumentation.uploadingDatasets.instructions.step7")}</li>
            </ol>
            </CardContent>
        </Card>
        </Box>
        <Box
            sx={{
            maxWidth: 1200,
            backgroundColor: "#f9f9f9",
            padding: 3,
            borderRadius: 2,
            boxShadow: 3,
            margin: "20px auto",
            }}
        >
            <Typography variant="h4" gutterBottom>
            {t("experimentDocumentation.title")}
            </Typography>

            <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
            {t("experimentDocumentation.introduction")}
            </Typography>

            {/* Crear Experimento */}
            <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6">
                {t("experimentDocumentation.creatingExperiment.title")}
                </Typography>
                <Typography sx={{ mb: 2 }}>
                {t("experimentDocumentation.creatingExperiment.description")}
                </Typography>
                <ol>
                <li>{t("experimentDocumentation.creatingExperiment.step1")}</li>
                <li>{t("experimentDocumentation.creatingExperiment.step2")}</li>
                <li>{t("experimentDocumentation.creatingExperiment.step3")}</li>
                <li>{t("experimentDocumentation.creatingExperiment.step4")}</li>
                <li>{t("experimentDocumentation.creatingExperiment.step5")}</li>
                </ol>
            </CardContent>
            </Card>

            {/* Iteraciones de Entrenamiento */}
            <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6">
                {t("experimentDocumentation.trainingIterations.title")}
                </Typography>
                <Typography>
                {t("experimentDocumentation.trainingIterations.description")}
                </Typography>
            </CardContent>
            </Card>

            {/* Después del Entrenamiento */}
            <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6">
                {t("experimentDocumentation.postTraining.title")}
                </Typography>
                <Typography>
                {t("experimentDocumentation.postTraining.description")}
                </Typography>
            </CardContent>
            </Card>
        </Box>
        <Box sx={{
            maxWidth: 1200,
            backgroundColor: "#f9f9f9",
            padding: 3,
            borderRadius: 2,
            boxShadow: 3,
            margin: "20px auto"
        }}>
        <Typography variant="h4" gutterBottom>
            {t("rulesDocumentation.title")}
        </Typography>
        <Card sx={{ mb: 3 }}>
            <CardContent>
            <Typography variant="h6">Introduction</Typography>
            <Typography>{t("rulesDocumentation.introduction")}</Typography>
            </CardContent>
        </Card>
        <Card sx={{ mb: 3 }}>
            <CardContent>
            <Typography variant="h6">{t("rulesDocumentation.syntax.title")}</Typography>
            <Typography>
                <strong>{t("rulesDocumentation.syntax.type.variables")}</strong> {t("rulesDocumentation.syntax.variables")}
            </Typography>
            <Typography>
                <strong>{t("rulesDocumentation.syntax.type.values")}</strong> {t("rulesDocumentation.syntax.values")}
            </Typography>
            <Typography>
                <strong>{t("rulesDocumentation.syntax.type.mathOperators")}</strong> {t("rulesDocumentation.syntax.mathOperators")}
            </Typography>
            <Typography>
                <strong>{t("rulesDocumentation.syntax.type.comparisonOperators")}</strong> {t("rulesDocumentation.syntax.comparisonOperators")}
            </Typography>
            <Typography>
                <strong>{t("rulesDocumentation.syntax.type.logicalOperators")}</strong> {t("rulesDocumentation.syntax.logicalOperators")}
            </Typography>
            <Typography color="error" sx={{ mt: 1 }}>
                {t("rulesDocumentation.syntax.notes")}
            </Typography>
            </CardContent>
        </Card>
        <Card sx={{ mb: 3 }}>
            <CardContent>
            <Typography variant="h6">{t("rulesDocumentation.examples.title")}</Typography>
            <Typography sx={{ fontFamily: "monospace", mb: 1 }}>
                {t("rulesDocumentation.examples.example1")}
            </Typography>
            <Typography sx={{ fontFamily: "monospace", mb: 1 }}>
                {t("rulesDocumentation.examples.example2")}
            </Typography>
            <Typography sx={{ fontFamily: "monospace", mb: 1 }}>
                {t("rulesDocumentation.examples.example3")}
            </Typography>
            </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
            <CardContent>
            <Typography variant="h6">{t("rulesDocumentation.warnings.title")}</Typography>
            <ul>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ErrorIcon fontSize="small" color="error" />
                    <p>{t("rulesDocumentation.warnings.warning1")}</p>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <WarningAmberIcon fontSize="small" color="warning" />
                    <p>{t("rulesDocumentation.warnings.warning2")}</p>
                </li>
            </ul>
            </CardContent>
        </Card>
        <Card>
            <CardContent>
            <Typography variant="h6">{t("rulesDocumentation.errors.title")}</Typography>
            <TableContainer component={Paper}>
                <Table size="small">
                <TableHead>
                    <TableRow>
                    <TableCell>{t("rulesDocumentation.errors.error") || "Error"}</TableCell>
                    <TableCell>{t("rulesDocumentation.errors.cause") || "Cause"}</TableCell>
                    <TableCell>{t("rulesDocumentation.errors.solution") || "Solution"}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {["unknownIdentifier","unsupportedOperator","chainedComparisons","unknownNodeType"].map((key) => (
                    <TableRow key={key}>
                        <TableCell>{t(`rulesDocumentation.errors.${key}.error`)}</TableCell>
                        <TableCell>{t(`rulesDocumentation.errors.${key}.cause`)}</TableCell>
                        <TableCell>{t(`rulesDocumentation.errors.${key}.solution`)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </TableContainer>
            </CardContent>
        </Card>
        </Box>
        </>
    );
}
