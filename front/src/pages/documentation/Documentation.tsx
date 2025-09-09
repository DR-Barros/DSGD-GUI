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

export default function Documentation() {
  const { t } = useTranslation();

  return (
    <Box sx={{
        maxWidth: 1200,
        backgroundColor: "#f9f9f9",
        padding: 3,
        borderRadius: 2,
        boxShadow: 3,
        margin: "20px auto"
    }}>
      {/* Título */}
      <Typography variant="h4" gutterBottom>
        {t("rulesDocumentation.title")}
      </Typography>

      {/* Introducción */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Introduction</Typography>
          <Typography>{t("rulesDocumentation.introduction")}</Typography>
        </CardContent>
      </Card>

      {/* Sintaxis Permitida */}
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

      {/* Ejemplos */}
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

      {/* Errores Comunes */}
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
  );
}
