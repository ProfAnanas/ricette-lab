// (Attesa Del Caricamento Pagina)
document.addEventListener('DOMContentLoaded', () => {
    caricaMenu();
});

let catalogoCompleto = [];

async function caricaMenu() {
    try {
        const response = await fetch('data/menu.json');
        if (!response.ok) throw new Error('Errore nel caricamento del file menu.json');
        const data = await response.json();
        catalogoCompleto = data.catalogo;
        disegnaGrigliaMenu(catalogoCompleto);
    } catch (error) {
        // (Se Qualcosa Si Rompe, Stampa L'Errore Nella Console)
        console.error('Errore di sistema:', error);
        document.getElementById('griglia-menu').innerHTML = '<p>Errore nel caricamento dell\'archivio.</p>';
    }
}

function disegnaGrigliaMenu(catalogo) {
    const contenitore = document.getElementById('griglia-menu');
    contenitore.innerHTML = '';

    catalogo.forEach(categoria => {
        const detailsCat = document.createElement('details');
        detailsCat.classList.add('blocco-categoria');

        const summaryCat = document.createElement('summary');
        summaryCat.textContent = categoria.nome_categoria;
        detailsCat.appendChild(summaryCat);

        categoria.sottocategorie.forEach(sub => {
            const detailsSub = document.createElement('details');
            detailsSub.classList.add('blocco-sottocategoria');

            const summarySub = document.createElement('summary');
            summarySub.textContent = sub.nome_sottocategoria;
            detailsSub.appendChild(summarySub);

            const divRicette = document.createElement('div');
            divRicette.classList.add('lista-ricette');

            sub.preparazioni.forEach(ricetta => {
                const bottone = document.createElement('button');
                bottone.textContent = ricetta.nome;
                bottone.classList.add('btn-ricetta');
                bottone.onclick = () => apriAlgoritmo(ricetta.id, ricetta.url_dati, ricetta.nome);
                divRicette.appendChild(bottone);
            });

            detailsSub.appendChild(divRicette);
            detailsCat.appendChild(detailsSub);
        });
        contenitore.appendChild(detailsCat);
    });
}

async function apriAlgoritmo(idRicetta, urlDati, nomeRicetta) {
    // 1. Nascondiamo il menu e mostriamo la ricetta
    document.getElementById('griglia-menu').style.display = 'none';
    document.getElementById('pannello-controllo').style.display = 'none';
    document.getElementById('vista-ricetta').style.display = 'block';
    document.getElementById('titolo-ricetta-corrente').textContent = nomeRicetta;
    
    // --> IL RESET DELLA PLANCIA <--
    // Rimuoviamo la modalità algoritmo (se era rimasta accesa)
    document.body.classList.remove('modalita-algoritmo');
    
    // Rimettiamo a posto anche il testo del pulsante, per sicurezza
    const btnToggle = document.getElementById('pulsante-toggle-vista');
    if (btnToggle) btnToggle.textContent = 'Mostra algoritmo';
    try {
        const response = await fetch(urlDati);
        if (!response.ok) throw new Error('File ricetta non trovato');
        const ricetta = await response.json();
        
        const listaIngredienti = document.getElementById('lista-ingredienti');
        const listaProcedimento = document.getElementById('lista-procedimento');
        const pannelloAlgoritmo = document.getElementById('pannello-algoritmo');
        
        listaIngredienti.innerHTML = '';
        listaProcedimento.innerHTML = '';
        pannelloAlgoritmo.innerHTML = '';
        
        ricetta.ingredienti.forEach(ingrediente => {
            const li = document.createElement('li');
            li.textContent = ingrediente;
            listaIngredienti.appendChild(li);
        });
        
        ricetta.procedimento.forEach(passaggio => {
            if (passaggio.tipo === 'bivio') {
                const divBivioTesto = document.createElement('div');
                divBivioTesto.classList.add('blocco-bivio-testo');
                
                const divBivioNodi = document.createElement('div');
                divBivioNodi.classList.add('contenitore-bivio-visivo');
                
                passaggio.rami.forEach(ramo => {
                    const stepTesto = creaTestoSinistra(ramo);
                    divBivioTesto.appendChild(stepTesto);
                    
                    const divNodo = creaNodoDestra(ramo);
                    divNodo.classList.add('nodo-ramo');
                    divBivioNodi.appendChild(divNodo);
                    
                    attivaSincronia(stepTesto, divNodo);
                });
                
                listaProcedimento.appendChild(divBivioTesto);
                pannelloAlgoritmo.appendChild(divBivioNodi);

            } else {
                const stepTesto = creaTestoSinistra(passaggio);
                listaProcedimento.appendChild(stepTesto);
                
                const divNodo = creaNodoDestra(passaggio);
                pannelloAlgoritmo.appendChild(divNodo);
                
                attivaSincronia(stepTesto, divNodo);
            }
        });
    } catch (error) {
        console.error('Errore nel caricamento della ricetta:', error);
        document.getElementById('lista-ingredienti').innerHTML = '<li>Errore: Impossibile Caricare I Dati Della Ricetta.</li>';
    }
}

function chiudiAlgoritmo() {
    document.getElementById('vista-ricetta').style.display = 'none';
    document.getElementById('griglia-menu').style.display = 'block';
    document.getElementById('pannello-controllo').style.display = 'flex'; 
}

// (Funzioni Specializzate Di Supporto)

function creaTestoSinistra(dati) {
    const stepContainer = document.createElement('div');
    stepContainer.classList.add('step-ricetta');
    stepContainer.id = dati.step_id;
    
    // Creiamo il contenitore per il numero
    const numeroStep = document.createElement('div');
    numeroStep.classList.add('numero-step');
    numeroStep.textContent = dati.step_id.replace('step-', ''); // Estrae solo il numero/lettera
    
    // Creiamo il contenitore per il testo
    const testoStep = document.createElement('div');
    testoStep.classList.add('testo-step');
    testoStep.textContent = dati.testo;
    
    // Li assembliamo
    stepContainer.appendChild(numeroStep);
    stepContainer.appendChild(testoStep);

// Gestiamo il click sul numero per far comparire il testo a sovrapposizione
    numeroStep.addEventListener('click', (evento) => {
        // Funziona solo se siamo in modalità algoritmo
        if (document.body.classList.contains('modalita-algoritmo')) {
            // Impedisce che il click faccia scorrere la pagina a caso
            evento.stopPropagation(); 
            
            // Chiude tutti gli altri testi eventualmente aperti
            document.querySelectorAll('.mostra-testo-popup').forEach(el => {
                if(el !== testoStep) el.classList.remove('mostra-testo-popup');
            });
            
            // Accende o spegne il testo di questo specifico step
            testoStep.classList.toggle('mostra-testo-popup');
        }
    });

    // Cliccando sul testo stesso, il popup scompare (deve stare FUORI dal precedente)
    testoStep.addEventListener('click', (evento) => {
        if (document.body.classList.contains('modalita-algoritmo')) {
            evento.stopPropagation();
            testoStep.classList.remove('mostra-testo-popup');
        }
    });

    return stepContainer;
}

function creaNodoDestra(dati) {
    const divNodo = document.createElement('div');
    divNodo.classList.add('nodo-visivo');
    divNodo.id = 'nodo-' + dati.step_id;
    
    // 1. GESTIONE CONTENUTO PRINCIPALE (Icona o Testo)
    if (dati.icona) {
        divNodo.classList.add('tipo-' + dati.icona);
        const divIcona = document.createElement('div');
        divIcona.classList.add('icona-principale');
        const imgIcona = document.createElement('img');
        imgIcona.src = `assets/icone/${dati.icona}.svg`; 
        imgIcona.onerror = () => { console.warn(`Icona mancante: ${dati.icona}.svg`); };
        divIcona.appendChild(imgIcona);
        divNodo.appendChild(divIcona);
    } 
    else if (dati.testo_nodo) {
        // Se non c'è l'icona ma c'è un testo specifico per il nodo
        const divTestoSpeciale = document.createElement('div');
        divTestoSpeciale.classList.add('testo-nodo-alternativo');
        divTestoSpeciale.textContent = dati.testo_nodo;
        divNodo.appendChild(divTestoSpeciale);
    }
    else {
        // Fallback: se mancano entrambi, mettiamo il numero dello step
        const testoPlaceholder = document.createElement('div');
        testoPlaceholder.textContent = "Step " + dati.step_id.replace('step-', '');
        divNodo.appendChild(testoPlaceholder);
    }

// Gestione dei parametri (Temperatura, Tempo, Dimensione)
    if (dati.temperatura || dati.tempo || dati.dimensione) {
        const divParametri = document.createElement('div');
        divParametri.classList.add('pannello-parametri');
        
        if (dati.temperatura) {
            const badgeTemp = document.createElement('span');
            badgeTemp.classList.add('badge-parametro', 'badge-temp');
            badgeTemp.textContent = `🌡️ ${dati.temperatura}`;
            divParametri.appendChild(badgeTemp);
        }
        
        if (dati.tempo) {
            const badgeTempo = document.createElement('span');
            badgeTempo.classList.add('badge-parametro', 'badge-tempo');
            badgeTempo.textContent = `⏱️ ${dati.tempo}`;
            divParametri.appendChild(badgeTempo);
        }

        if (dati.dimensione) {
            const badgeDim = document.createElement('span');
            badgeDim.classList.add('badge-parametro', 'badge-dim');
            // Usiamo il righello come avevi chiesto
            badgeDim.textContent = `📏 ${dati.dimensione}`;
            divParametri.appendChild(badgeDim);
        }
        
        divNodo.appendChild(divParametri);
    }
    
    return divNodo;
}

function attivaSincronia(testo, nodo) {
    // Eventi del mouse per l'evidenziazione temporanea
    testo.addEventListener('mouseenter', () => {
        testo.classList.add('evidenziato');
        nodo.classList.add('nodo-attivo');
    });
    
    testo.addEventListener('mouseleave', () => {
        testo.classList.remove('evidenziato');
        nodo.classList.remove('nodo-attivo');
    });
    
    nodo.addEventListener('mouseenter', () => {
        nodo.classList.add('nodo-attivo');
        testo.classList.add('evidenziato');
        // Fa scorrere la colonna sinistra per mantenere allineato il numero
        testo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    
    nodo.addEventListener('mouseleave', () => {
        nodo.classList.remove('nodo-attivo');
        testo.classList.remove('evidenziato');
    });

    // IL NUOVO EVENTO: Clic sul nodo visivo
    nodo.addEventListener('click', (evento) => {
        // Interveniamo solo se siamo nella plancia di destra
        if (document.body.classList.contains('modalita-algoritmo')) {
            evento.stopPropagation();
            
            // Andiamo a pescare il div del testo specifico dentro il contenitore di sinistra
            const testoStep = testo.querySelector('.testo-step');
            
            if (testoStep) {
                // Chiudiamo gli altri pop-up per mantenere l'interfaccia in ordine
                document.querySelectorAll('.mostra-testo-popup').forEach(el => {
                    if (el !== testoStep) el.classList.remove('mostra-testo-popup');
                });
                
                // Evoca (o nasconde) il testo associato a questo nodo
                testoStep.classList.toggle('mostra-testo-popup');
            }
        }
    });
}

// Funzione per passare dal testo all'algoritmo
function cambiaVista() {
    const body = document.body;
    const btn = document.getElementById('pulsante-toggle-vista');

    // Aggiunge o toglie la classe che cambia l'intero layout
    body.classList.toggle('modalita-algoritmo');

    if (body.classList.contains('modalita-algoritmo')) {
        btn.textContent = 'Mostra testo completo';
    } else {
        btn.textContent = 'Mostra algoritmo';
        // Chiude eventuali popup di testo rimasti aperti
        document.querySelectorAll('.mostra-testo-popup').forEach(el => el.classList.remove('mostra-testo-popup'));
    }
}