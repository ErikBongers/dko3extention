VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "MyEventClass"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Public WithEvents App As Word.Application
Attribute App.VB_VarHelpID = -1

Private Sub App_MailMergeAfterRecordMerge(ByVal doc As Document)
    MakeBold doc, "kaffee"
End Sub

Private Sub MakeBold(ByVal doc As Document, ByVal searchText As String)
Application.ScreenUpdating = False
With doc.mailMerge.DataSource
 MsgBox .DataFields(1).value & " " & _
 .DataFields(2).value & " is finished merging."
 End With
 doc.mailMerge.EditMainDocument
With doc.Range
  With .Find
    .ClearFormatting
    .Forward = True
    .Wrap = wdFindContinue
    .Format = False ' TODO: what does this mean?
    .MatchCase = True
    
    .Text = searchText
    
    .Replacement.Text = "BOLD"
    .Replacement.ClearFormatting
    .Replacement.Font.Bold = True
    
    .Execute Replace:=wdReplaceAll
  End With
End With
Application.ScreenUpdating = True
End Sub

Private Sub TESTSendDocByEmail(doc As Document, recipient As String)

    Dim olApp As Object
    Dim olMail As Object

    Set olApp = CreateObject("Outlook.Application")
    Set olMail = olApp.CreateItem(0)

    Set isIt = olMail.inspector.IsWordMail

End Sub

Private Sub MergeModifySend()

    Dim i As Long
    Dim recCount As Long
    Dim mergedDoc As Document
    Dim email As String

    recCount = ActiveDocument.mailMerge.DataSource.RecordCount

    For i = 1 To recCount

        With ActiveDocument.mailMerge
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
        email = ActiveDocument.mailMerge.DataSource.DataFields("Email").value

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
        .subject = "Your document"
        .Body = "Please see attached."
        .Attachments.Add Environ("TEMP") & "\temp.pdf"
        .Send
    End With

End Sub

