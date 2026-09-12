import OPEN_FILM from "../assets/time-capsule/ceremony-open.mp4";
import CLOSE_FILM from "../assets/time-capsule/ceremony-close.mp4";
import CLOSED_ENDPOINT from "../assets/time-capsule/vault-sealed.png";
import OPEN_ENDPOINT from "../assets/time-capsule/vault-opened.png";
import CREDITS from "../assets/time-capsule/recording-credits.txt";

// Byte-identical films approved at 178f8ed. Endpoints are decoded final frames.
// Keep picture, vapor and recorded audio on the film's single media clock.
export const CAPSULE_PRESENTATION = Object.freeze({
  opening: { src: OPEN_FILM, poster: CLOSED_ENDPOINT, end: OPEN_ENDPOINT, duration: 6 },
  sealing: { src: CLOSE_FILM, poster: OPEN_ENDPOINT, end: CLOSED_ENDPOINT, duration: 5.4 },
});

export { CLOSED_ENDPOINT, OPEN_ENDPOINT, CREDITS as CAPSULE_RECORDING_CREDITS };
