Dim X As New MyEventClass
Sub InitializeApp()
    Set X.App = Word.Application
End Sub

Sub MergeModifySendAll()
    Dim i As Long
    Dim recCount As Long
    Dim mergedDoc As Document
    Dim email As String

    recCount = ActiveDocument.MailMerge.DataSource.RecordCount

    For i = 1 To recCount

        With ActiveDocument.MailMerge
            .DataSource.FirstRecord = i
            .DataSource.LastRecord = i
            .Destination = wdSendToNewDocument
            .Execute Pause:=False
        End With

        Set mergedDoc = ActiveDocument

        'Example modification
        mergedDoc.Content.Find.Execute _
            FindText:="PLACEHOLDER", _
            ReplaceWith:="Custom text for record " & i, _
            Replace:=wdReplaceAll

        'Get email from data source
        email = ActiveDocument.MailMerge.DataSource.DataFields("Email").Value

        'Send email via Outlook
        SendDocByEmail mergedDoc, email

        mergedDoc.Close SaveChanges:=False

    Next i

End Sub


Private Sub SendDocByEmail(doc As Document, recipient As String)

    Dim olApp As Object
    Dim olMail As Object

    Set olApp = CreateObject("Outlook.Application")
    Set olMail = olApp.CreateItem(0)

    doc.ExportAsFixedFormat Environ("TEMP") & "\temp.pdf", wdExportFormatPDF

    With olMail
        .To = recipient
        .Subject = "Your document"
        .Body = "Please see attached."
        .Attachments.Add Environ("TEMP") & "\temp.pdf"
        .Send
    End With

End Sub

Private Sub EmailThisDoc(doc As Document, recipient As String)
Dim oMailItem As Object, oOLapp As Object
Dim Word As Object, MsgTxt$
Set oOLapp = CreateObject("Outlook.Application")
Set oMailItem = oOLapp.CreateItem(0)
Set Word = CreateObject("word.application")
' Set doc = Word.Documents.Open(FileName:="c:\pub\first2.docm", ReadOnly:=True)
' MsgTxt = doc.Range(Start:=doc.Paragraphs(1).Range.Start, End:=doc.Paragraphs(doc.Paragraphs.Count).Range.End)
MsgTxt = doc.Range()
With oMailItem
    .To = recipient
    .cc = recipient
    .Subject = "Test Erik"
    .HTMLBody = "<b>Boldly</b> <u>go</u><p>where no man has gone before.</p>"
'    .Display
    .Send
End With
Set oOLapp = Nothing
Set oMailItem = Nothing
End Sub

Sub SendTestMail()
  EmailThisDoc ActiveDocument, "erikbongers@outlook.com"
End Sub



