"""Adaptador de Nivel 1 (RI-02): permite demostrar el flujo completo sin un LMS real.

`send_result` no llama a ningun servicio externo: construye el payload que se habria
enviado y lo devuelve para que EvaluationService lo persista en la evaluacion, donde
queda visible en la pantalla de detalle del historial."""

from app.integrations.lms.adapter import LMSAdapter, LMSSendResult


class SimulatorAdapter(LMSAdapter):
    def send_result(self, evaluation) -> LMSSendResult:
        payload = self.build_payload(evaluation)
        payload["transport"] = "SIMULATOR"
        payload["integration_id"] = self.integration_id
        return LMSSendResult(success=True, payload=payload)
