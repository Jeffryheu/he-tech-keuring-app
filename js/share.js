// Safari (iPad/iPhone) staat navigator.share alleen toe direct na een tik. Het maken van de PDF
// duurt te lang om in dezelfde tik te delen, dus eerst de PDF maken en dan een eigen deelknop tonen.
export async function deelPdf(pdfBytes, bestandsnaam) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const file = new File([blob], bestandsnaam, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    return toonDeelknop(file, bestandsnaam);
  }

  // Fallback voor browsers zonder bestanden-delen (bv. desktop tijdens ontwikkelen):
  // open de PDF in een nieuw tabblad zodat hij handmatig opgeslagen kan worden.
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  return false;
}

function toonDeelknop(file, bestandsnaam) {
  return new Promise((resolve, reject) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'deel-dialog';
    dialog.innerHTML = `
      <p><strong>Rapport is klaar</strong></p>
      <p class="hint"></p>
      <div class="deel-dialog__acties">
        <button type="button" class="btn btn--primary" data-actie="deel">Deel rapport</button>
        <button type="button" class="btn" data-actie="sluit">Sluiten</button>
      </div>`;
    dialog.querySelector('.hint').textContent = bestandsnaam;
    document.body.append(dialog);

    const sluit = () => { dialog.close(); dialog.remove(); };
    dialog.querySelector('[data-actie="sluit"]').addEventListener('click', () => { sluit(); resolve(false); });
    dialog.querySelector('[data-actie="deel"]').addEventListener('click', () => {
      // Geen await vóór share: de aanroep moet binnen deze tik vallen.
      navigator.share({ files: [file], title: bestandsnaam })
        .then(() => { sluit(); resolve(true); })
        .catch((err) => {
          if (err.name === 'AbortError') return; // geannuleerd: dialoog blijft staan om opnieuw te tikken
          sluit();
          reject(err);
        });
    });
    dialog.showModal();
  });
}
