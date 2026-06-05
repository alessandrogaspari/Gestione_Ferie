' ========================================
' MODULO VBA PER FORMATTAZIONE PROSPETTO FERIE
' ========================================
' Questo modulo contiene le macro per formattare automaticamente
' tutti i fogli mensili del prospetto ferie secondo le regole:
' 1. Sfondo rosso per colonne di sabati e festività
' 2. Bordi neri per tutte le celle utilizzate
' 3. Ridimensionamento automatico delle celle
' 4. Applicazione dinamica su tutti i fogli fino all'ultima riga utente
' 5. Unisci celle del titolo "PROSPETTO FERIE ANNO" con sfondo grigio e testo centrato
' 6. Unisci celle dei ruoli utente (DSGA, ASSISTENTI AMMINISTRATIVI, ecc.)
' 7. Sfondo verde chiaro per celle che contengono tipologie di ferie

Option Explicit

' Macro principale per formattare tutti i fogli
Sub FormattaTuttiIFogli()
    Dim ws As Worksheet
    Dim risposta As VbMsgBoxResult
    
    ' Chiedi conferma all'utente
    risposta = MsgBox("Vuoi formattare tutti i fogli del prospetto ferie?" & vbCrLf & _
                     "Questa operazione applicherà:" & vbCrLf & _
                     "- Sfondo rosso per sabati e festività" & vbCrLf & _
                     "- Bordi neri a tutte le celle" & vbCrLf & _
                     "- Ridimensionamento automatico", _
                     vbYesNo + vbQuestion, "Conferma Formattazione")
    
    If risposta = vbNo Then Exit Sub
    
    ' Disabilita aggiornamento schermo per velocizzare
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    Application.DisplayAlerts = False ' Disabilita messaggi di conferma
    
    ' Applica formattazione a tutti i fogli
    For Each ws In ThisWorkbook.Worksheets
        ' Salta fogli che non sono mensili (es. fogli di configurazione)
        If Not (ws.Name Like "*Config*" Or ws.Name Like "*Dati*" Or ws.Name Like "*Setup*") Then
            Call FormattaFoglioMensile(ws)
        End If
    Next ws
    
    ' Riabilita aggiornamento
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
    Application.DisplayAlerts = True ' Riabilita messaggi di conferma
    
    MsgBox "Formattazione completata per tutti i fogli!", vbInformation, "Operazione Completata"
End Sub

' Formatta un singolo foglio mensile
Sub FormattaFoglioMensile(ws As Worksheet)
    Dim ultimaRiga As Long
    Dim ultimaColonna As Long
    Dim rangeFormattazione As Range
    Dim col As Long
    Dim riga As Long
    Dim cellValue As String
    Dim giornoSettimana As String
    
    With ws
        ' Trova l'ultima riga con dati (cerca nella colonna A per i nomi utenti)
        ultimaRiga = .Cells(.Rows.Count, 1).End(xlUp).Row
        
        ' Trova l'ultima colonna con dati (cerca nella riga 3 per i giorni)
        ultimaColonna = .Cells(3, .Columns.Count).End(xlToLeft).Column
        
        ' Definisce il range di formattazione (dall'intestazione all'ultima riga utente)
        Set rangeFormattazione = .Range(.Cells(1, 1), .Cells(ultimaRiga, ultimaColonna))
        
        ' ========================================
        ' REGOLA 2: APPLICA BORDI NERI A TUTTE LE CELLE
        ' ========================================
        With rangeFormattazione.Borders
            .LineStyle = xlContinuous
            .Weight = xlThin
            .Color = RGB(0, 0, 0) ' Nero
        End With
        
        ' ========================================
        ' REGOLA 1: SFONDO ROSSO PER SABATI E FESTIVITÀ
        ' ========================================
        ' Analizza ogni colonna a partire dalla colonna C (3)
        For col = 3 To ultimaColonna
            ' Controlla il contenuto della riga 4 (giorni della settimana)
            If .Cells(4, col).Value <> "" Then
                giornoSettimana = Trim(UCase(.Cells(4, col).Value))
                
                ' Verifica se è sabato o domenica
                If InStr(giornoSettimana, "SAB") > 0 Or _
                   InStr(giornoSettimana, "DOM") > 0 Or _
                   InStr(giornoSettimana, "SABATO") > 0 Or _
                   InStr(giornoSettimana, "DOMENICA") > 0 Then
                    
                    ' Colora tutta la colonna di rosso
                    .Range(.Cells(1, col), .Cells(ultimaRiga, col)).Interior.Color = RGB(255, 0, 0)
                End If
                
                ' Verifica anche se è una festività (cerca indicatori comuni)
                If InStr(giornoSettimana, "FEST") > 0 Or _
                   InStr(giornoSettimana, "FERIE") > 0 Or _
                   InStr(giornoSettimana, "CHIUSO") > 0 Then
                    
                    ' Colora tutta la colonna di rosso
                    .Range(.Cells(1, col), .Cells(ultimaRiga, col)).Interior.Color = RGB(255, 0, 0)
                End If
            End If
        Next col
        
        ' ========================================
        ' REGOLA 5: UNISCI E FORMATTA TITOLO PROSPETTO FERIE
        ' ========================================
        Call FormattaTitoloProspettoFerie(ws, ultimaColonna)
        
        ' ========================================
        ' REGOLA 6: UNISCI CELLE DEI RUOLI UTENTE
        ' ========================================
        Call FormattaRuoliUtente(ws, ultimaRiga, ultimaColonna)
        
        ' ========================================
        ' REGOLA 7: SFONDO VERDE CHIARO PER TIPOLOGIE FERIE
        ' ========================================
        Call FormattaTipologieFerie(ws, ultimaRiga, ultimaColonna)
        

        
        ' ========================================
        ' REGOLA 3: RIDIMENSIONAMENTO AUTOMATICO
        ' ========================================
        ' Ridimensiona automaticamente le colonne
        .Columns("A:" & Split(.Cells(1, ultimaColonna).Address, "$")(1)).AutoFit
        
        ' Ridimensiona automaticamente le righe
        .Rows("1:" & ultimaRiga).AutoFit
        
        ' Imposta una larghezza minima per le colonne dei giorni
        For col = 3 To ultimaColonna
            If .Columns(col).ColumnWidth < 4 Then
                .Columns(col).ColumnWidth = 4
            End If
        Next col
        
        ' Imposta un'altezza minima per le righe
        For riga = 1 To ultimaRiga
            If .Rows(riga).RowHeight < 15 Then
                .Rows(riga).RowHeight = 15
            End If
        Next riga
        
    End With
End Sub

' Macro per formattare solo il foglio attivo
Sub FormattaFoglioAttivo()
    Dim ws As Worksheet
    Set ws = ActiveSheet
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Call FormattaFoglioMensile(ws)
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    
    MsgBox "Formattazione completata per il foglio: " & ws.Name, vbInformation
End Sub

' Macro per rimuovere tutta la formattazione
Sub RimuoviFormattazione()
    Dim ws As Worksheet
    Dim risposta As VbMsgBoxResult
    
    risposta = MsgBox("Vuoi rimuovere tutta la formattazione da tutti i fogli?", _
                     vbYesNo + vbExclamation, "Conferma Rimozione")
    
    If risposta = vbNo Then Exit Sub
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    For Each ws In ThisWorkbook.Worksheets
        If Not (ws.Name Like "*Config*" Or ws.Name Like "*Dati*" Or ws.Name Like "*Setup*" Or ws.Name Like "*SOSPENSIONI*") Then
            With ws.UsedRange
                .Borders.LineStyle = xlNone
                .Interior.ColorIndex = xlNone
            End With
        End If
    Next ws
    
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    MsgBox "Formattazione rimossa da tutti i fogli!", vbInformation
End Sub

' Macro per applicare solo i bordi
Sub ApplicaSoloBordi()
    Dim ws As Worksheet
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    For Each ws In ThisWorkbook.Worksheets
        If Not (ws.Name Like "*Config*" Or ws.Name Like "*Dati*" Or ws.Name Like "*Setup*" Or ws.Name Like "*SOSPENSIONI*") Then
            With ws.UsedRange.Borders
                .LineStyle = xlContinuous
                .Weight = xlThin
                .Color = RGB(0, 0, 0)
            End With
        End If
    Next ws
    
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    MsgBox "Bordi applicati a tutti i fogli!", vbInformation
End Sub

' Macro per applicare solo i colori rossi
Sub ApplicaSoloColoriRossi()
    Dim ws As Worksheet
    Dim ultimaRiga As Long
    Dim ultimaColonna As Long
    Dim col As Long
    Dim giornoSettimana As String
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    For Each ws In ThisWorkbook.Worksheets
        If Not (ws.Name Like "*Config*" Or ws.Name Like "*Dati*" Or ws.Name Like "*Setup*" Or ws.Name Like "*SOSPENSIONI*") Then
            With ws
                ultimaRiga = .Cells(.Rows.Count, 1).End(xlUp).Row
                ultimaColonna = .Cells(3, .Columns.Count).End(xlToLeft).Column
                
                For col = 3 To ultimaColonna
                    If .Cells(4, col).Value <> "" Then
                        giornoSettimana = Trim(UCase(.Cells(4, col).Value))
                        
                        If InStr(giornoSettimana, "SAB") > 0 Or _
                           InStr(giornoSettimana, "DOM") > 0 Or _
                           InStr(giornoSettimana, "FEST") > 0 Then
                            
                            .Range(.Cells(1, col), .Cells(ultimaRiga, col)).Interior.Color = RGB(255, 0, 0)
                        End If
                    End If
                Next col
            End With
        End If
    Next ws
    
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    MsgBox "Colori rossi applicati a tutti i fogli!", vbInformation
End Sub

' Macro per applicare solo i colori verdi alle tipologie di ferie
Sub ApplicaSoloColoriVerdi()
    Dim ws As Worksheet
    Dim ultimaRiga As Long
    Dim ultimaColonna As Long
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    For Each ws In ThisWorkbook.Worksheets
        If Not (ws.Name Like "*Config*" Or ws.Name Like "*Dati*" Or ws.Name Like "*Setup*" Or ws.Name Like "*SOSPENSIONI*") Then
            With ws
                ultimaRiga = .Cells(.Rows.Count, 1).End(xlUp).Row
                ultimaColonna = .Cells(3, .Columns.Count).End(xlToLeft).Column
                
                Call FormattaTipologieFerie(ws, ultimaRiga, ultimaColonna)
            End With
        End If
    Next ws
    
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    MsgBox "Colori verdi applicati alle tipologie di ferie in tutti i fogli!", vbInformation
End Sub



' Formatta il titolo "PROSPETTO FERIE ANNO" unendo le celle e applicando sfondo grigio
Sub FormattaTitoloProspettoFerie(ws As Worksheet, ultimaColonna As Long)
    Dim riga As Long
    Dim cellValue As String
    Dim rangeUnione As Range
    
    With ws
        ' Cerca la riga che contiene "PROSPETTO FERIE ANNO"
        For riga = 1 To 10 ' Cerca nelle prime 10 righe
            cellValue = Trim(UCase(.Cells(riga, 1).Value))
            If InStr(cellValue, "PROSPETTO FERIE ANNO") > 0 Then
                ' Unisci tutte le celle della riga
                Set rangeUnione = .Range(.Cells(riga, 1), .Cells(riga, ultimaColonna))
                
                ' Unisci le celle
                rangeUnione.Merge
                
                ' Applica formattazione
                With rangeUnione
                    .HorizontalAlignment = xlCenter
                    .VerticalAlignment = xlCenter
                    .Interior.Color = RGB(192, 192, 192) ' Grigio
                    .Font.Bold = True
                    .Font.Size = 14
                End With
                
                Exit For
            End If
        Next riga
    End With
End Sub

' Formatta i ruoli utente unendo le celle
Sub FormattaRuoliUtente(ws As Worksheet, ultimaRiga As Long, ultimaColonna As Long)
    Dim riga As Long
    Dim cellValue As String
    Dim rangeUnione As Range
    Dim ruoli As Variant
    Dim i As Integer
    
    ' Lista dei ruoli da cercare
    ruoli = Array("DSGA", "ASSISTENTI AMMINISTRATIVI", "ASSISTENTI TECNICI", _
                  "COLLABORATORI SCOLASTICI", "DOCENTI", "PERSONALE ATA", _
                  "DIRIGENTE SCOLASTICO", "DIRETTORE")
    
    With ws
        ' Cerca ogni ruolo nelle righe
        For riga = 1 To ultimaRiga
            cellValue = Trim(UCase(.Cells(riga, 1).Value))
            
            ' Controlla se la cella contiene uno dei ruoli
            For i = 0 To UBound(ruoli)
                If InStr(cellValue, ruoli(i)) > 0 And Len(cellValue) < 50 Then ' Evita righe troppo lunghe
                    ' Unisci tutte le celle della riga
                    Set rangeUnione = .Range(.Cells(riga, 1), .Cells(riga, ultimaColonna))
                    
                    ' Unisci le celle
                    rangeUnione.Merge
                    
                    ' Applica formattazione
                    With rangeUnione
                        .HorizontalAlignment = xlCenter
                        .VerticalAlignment = xlCenter
                        .Font.Bold = True
                        .Font.Size = 12
                        .Interior.Color = RGB(220, 220, 220) ' Grigio chiaro
                    End With
                    
                    Exit For ' Esci dal loop dei ruoli per questa riga
                End If
            Next i
        Next riga
    End With
End Sub
 
 ' Formatta le celle contenenti tipologie di ferie con sfondo verde chiaro
 Sub FormattaTipologieFerie(ws As Worksheet, ultimaRiga As Long, ultimaColonna As Long)
     Dim riga As Long
     Dim col As Long
     Dim cellValue As String
     Dim tipologieFerie As Variant
     Dim i As Integer
     
     ' Lista delle abbreviazioni di ferie da cercare
     tipologieFerie = Array("F", "FV", "FS", "R", "MF")
     
     With ws
         ' Scansiona tutte le celle del range utilizzato
         For riga = 1 To ultimaRiga
             For col = 1 To ultimaColonna
                 If .Cells(riga, col).Value <> "" Then
                     cellValue = Trim(UCase(.Cells(riga, col).Value))
                     
                     ' Controlla se la cella contiene esattamente una delle abbreviazioni
                     For i = 0 To UBound(tipologieFerie)
                         If cellValue = tipologieFerie(i) Then
                             ' Applica sfondo verde chiaro
                             .Cells(riga, col).Interior.Color = RGB(144, 238, 144) ' Verde chiaro
                             Exit For ' Esci dal loop delle tipologie per questa cella
                         End If
                     Next i
                 End If
             Next col
         Next riga
     End With
 End Sub




 
 ' ========================================
 ' ISTRUZIONI PER L'UTILIZZO:
' ========================================
' 1. Copia tutto questo codice
' 2. Apri il file Excel del prospetto ferie
' 3. Premi Alt + F11 per aprire l'editor VBA
' 4. Inserisci > Modulo
' 5. Incolla questo codice nel nuovo modulo
' 6. Salva il file come .xlsm (Excel con macro)
' 7. Esegui la macro "FormattaTuttiIFogli" per applicare tutta la formattazione
' 
' MACRO DISPONIBILI:
' - FormattaTuttiIFogli: Applica tutta la formattazione a tutti i fogli
' - FormattaFoglioAttivo: Formatta solo il foglio correntemente selezionato
' - ApplicaSoloBordi: Applica solo i bordi neri
' - ApplicaSoloColoriRossi: Applica solo i colori rossi per sabati/festività
' - ApplicaSoloColoriVerdi: Applica solo i colori verdi per tipologie di ferie

' - RimuoviFormattazione: Rimuove tutta la formattazione
'

' ========================================