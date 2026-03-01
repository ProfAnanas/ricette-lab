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
                
                // INSERIMENTO PER IL FILTRO: Assegna l'anno letto dal JSON (se non c'è, mette 'tutti')
                bottone.setAttribute('data-anno', ricetta.anno || 'tutti');
                bottone.setAttribute('data-tag', ricetta.tag || '');
                
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
    // Contenitore principale della riga
    const stepContainer = document.createElement('div');
    stepContainer.classList.add('step-ricetta');

    // 1. Creiamo subito il numero e il testo (così il checkbox li "vede")
    const numeroStep = document.createElement('div');
    numeroStep.classList.add('numero-step');
    numeroStep.textContent = dati.step_id.replace('step-', '');

    const testoStep = document.createElement('div');
    testoStep.classList.add('testo-step');
    testoStep.textContent = dati.testo;

    // 2. Creiamo il checkbox
    const divCheck = document.createElement('div');
    divCheck.classList.add('contenitore-check');

    const checkStep = document.createElement('input');
    checkStep.type = 'checkbox';
    checkStep.id = 'check-' + dati.step_id; 
    checkStep.classList.add('checkbox-stato-step');
    checkStep.setAttribute('aria-label', `Segna step ${dati.step_id.replace('step-','')} come completato`);

    // 3. La logica del click sul checkbox
    checkStep.addEventListener('change', () => {
        const nodoVisivoTarget = document.getElementById('nodo-' + dati.step_id);
        
        if (checkStep.checked) {
            // Step fatto: barra il testo e spegne il numero
            testoStep.classList.add('testo-barrato');
            numeroStep.classList.add('numero-barrato');
            
            // Dimmera il nodo a destra
            if (nodoVisivoTarget) {
                nodoVisivoTarget.classList.add('nodo-completato');
            }
        } else {
            // Step non fatto: toglie la riga e riaccende il numero
            testoStep.classList.remove('testo-barrato');
            numeroStep.classList.remove('numero-barrato');
            
            if (nodoVisivoTarget) {
                nodoVisivoTarget.classList.remove('nodo-completato');
            }
        }
    });

    divCheck.appendChild(checkStep);

    // 4. Assembliamo la riga nell'ordine corretto da sinistra a destra
    stepContainer.appendChild(divCheck);
    stepContainer.appendChild(numeroStep);
    stepContainer.appendChild(testoStep);

    // 5. Gestione dei popup quando si clicca sul numero o sul testo
    numeroStep.addEventListener('click', (evento) => {
        if (document.body.classList.contains('modalita-algoritmo')) {
            evento.stopPropagation(); 
            
            document.querySelectorAll('.mostra-testo-popup').forEach(el => {
                if(el !== testoStep) el.classList.remove('mostra-testo-popup');
            });
            
            testoStep.classList.toggle('mostra-testo-popup');
        }
    });

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
        testo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    
    nodo.addEventListener('mouseleave', () => {
        nodo.classList.remove('nodo-attivo');
        testo.classList.remove('evidenziato');
    });

    // IL NUOVO EVENTO: Clic sul nodo visivo
    nodo.addEventListener('click', (evento) => {
        if (document.body.classList.contains('modalita-algoritmo')) {
            evento.stopPropagation();
            
            const testoStep = testo.querySelector('.testo-step');
            
            if (testoStep) {
                document.querySelectorAll('.mostra-testo-popup').forEach(el => {
                    if (el !== testoStep) el.classList.remove('mostra-testo-popup');
                });
                
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
        btn.textContent = 'Ricetta testuale';
    } else {
        btn.textContent = 'Mostra algoritmo';
        // Chiude eventuali popup di testo rimasti aperti
        document.querySelectorAll('.mostra-testo-popup').forEach(el => el.classList.remove('mostra-testo-popup'));
    }
}

// --- FUNZIONE SCHERMO SEMPRE ON (Wake Lock API) ---
let wakeLock = null;
const btnWakeLock = document.getElementById('btn-wake-lock');

if (btnWakeLock) {
    btnWakeLock.addEventListener('click', async () => {
        if (!wakeLock) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                btnWakeLock.classList.add('attivo');
                btnWakeLock.textContent = '☀️ Schermo: SEMPRE ACCESO';

                wakeLock.addEventListener('release', () => {
                    wakeLock = null;
                    btnWakeLock.classList.remove('attivo');
                    btnWakeLock.textContent = '🌙 Schermo: NORMALE';
                });
            } catch (err) {
                console.error('Errore Wake Lock:', err.name, err.message);
                alert('Il tuo browser o dispositivo non supporta il blocco dello schermo, oppure la batteria è in risparmio energetico estremo.');
            }
        } else {
            await wakeLock.release();
            wakeLock = null;
            btnWakeLock.classList.remove('attivo');
            btnWakeLock.textContent = '🌙 Schermo: NORMALE';
        }
    });
}

// --- GESTIONE RICERCA E FILTRO ANNUALITÀ ---
const campoRicerca = document.getElementById('campo-ricerca');
const filtroAnno = document.getElementById('filtro-anno');

function applicaFiltri() {
    const testoCercato = campoRicerca.value.toLowerCase();
    const annoSelezionato = filtroAnno.value;

    // 1. Filtra i singoli pulsanti delle ricette
    const bottoniRicette = document.querySelectorAll('.btn-ricetta');
    
    bottoniRicette.forEach(bottone => {
        const nomeRicetta = bottone.textContent.toLowerCase();
        // Recupera l'anno e i tag che abbiamo nascosto nel bottone
        const annoRicetta = bottone.getAttribute('data-anno');
        const tagRicetta = (bottone.getAttribute('data-tag') || '').toLowerCase();
        
        // Verifica se il testo digitato è contenuto nel nome OPPURE nei tag
        const corrispondeTesto = nomeRicetta.includes(testoCercato) || tagRicetta.includes(testoCercato);
        
        // Verifica se l'anno corrisponde
        let corrispondeAnno = false;
        if (annoSelezionato === 'tutti') {
            corrispondeAnno = true;
        } else if (annoRicetta && (annoRicetta.includes(annoSelezionato) || annoRicetta === 'tutti')) {
            corrispondeAnno = true;
        }

        // Accende o spegne il bottone della singola ricetta
        if (corrispondeTesto && corrispondeAnno) {
            bottone.style.display = 'block';
        } else {
            bottone.style.display = 'none';
        }
    });

    // 2. Nasconde le sottocategorie se sono vuote
    document.querySelectorAll('.blocco-sottocategoria').forEach(sottocategoria => {
        const bottoniVisibili = Array.from(sottocategoria.querySelectorAll('.btn-ricetta'))
                                     .filter(b => b.style.display !== 'none');
        
        if (bottoniVisibili.length === 0) {
            sottocategoria.style.display = 'none';
        } else {
            sottocategoria.style.display = 'block';
        }
    });

    // 3. Nasconde le categorie principali se sono vuote
    document.querySelectorAll('.blocco-categoria').forEach(categoria => {
        const bottoniVisibili = Array.from(categoria.querySelectorAll('.btn-ricetta'))
                                     .filter(b => b.style.display !== 'none');
        
        if (bottoniVisibili.length === 0) {
            categoria.style.display = 'none';
        } else {
            categoria.style.display = 'block';
        }
    });
}

// Colleghiamo i sensori per far scattare la funzione in tempo reale
if (campoRicerca) {
    campoRicerca.addEventListener('input', applicaFiltri); 
}
if (filtroAnno) {
    filtroAnno.addEventListener('change', applicaFiltri); 
}