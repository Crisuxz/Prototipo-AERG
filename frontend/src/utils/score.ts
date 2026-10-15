/** El maximo proviene del snapshot de rubrica; el backend vuelve a validarlo al guardar. */
export const isScoreValid = (value: number, max: number) => Number.isFinite(value) && value >= 0 && value <= max
