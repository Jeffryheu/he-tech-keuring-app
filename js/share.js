export async function deelPdf(pdfBytes, bestandsnaam) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const file = new File([blob], bestandsnaam, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: bestandsnaam });
    return true;
  }

  // Fallback voor browsers zonder bestanden-delen (bv. desktop tijdens ontwikkelen):
  // open de PDF in een nieuw tabblad zodat hij handmatig opgeslagen kan worden.
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  return false;
}
