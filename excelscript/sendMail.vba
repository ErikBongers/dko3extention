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
    .HTMLBody = Convert2HTML MsgTxt
'    .Display
    .Send
End With
Set oOLapp = Nothing
Set oMailItem = Nothing
End Sub

Sub SendTestMail()
  EmailThisDoc ActiveDocument, "erikbongers@outlook.com"
End Sub

' Source - https://stackoverflow.com/a/63470622
' Posted by Edson, modified by community. See post 'Timeline' for change history
' Retrieved 2026-03-06, License - CC BY-SA 4.0

Function ConvertExcelCell2HTML(myCell As Range) As String
    Dim bldTagOn, itlTagOn, ulnTagOn, colTagOn, phaTagOn As Boolean
    Dim i, chrCount, spaceCount As Integer
    Dim chrCol, chrLastCol, htmlTxt As String

    bldTagOn = False
    itlTagOn = False
    ulnTagOn = False
    colTagOn = False
    phaTagOn = False
    chrCol = "NONE"
    htmlTxt = "<div>"
    chrCount = myCell.Characters.Count
    spaceCount = 0
    For i = 1 To chrCount
        With myCell.Characters(i, 1)

            If myCell.Characters(i, 4).Text = "    " And Not phaTagOn Then
                htmlTxt = htmlTxt & "<p style='text-indent: 40px'>"
                phaTagOn = True
            Else
                If myCell.Characters(i, 4).Text = "    " And phaTagOn Then
                    htmlTxt = htmlTxt & "</p><p style='text-indent: 40px'>"
                    phaTagOn = True
                End If
            End If

            If (.Font.Color) Then
                chrCol = GetCol(.Font.Color)
                If Not colTagOn Then
                    htmlTxt = htmlTxt & "<font color=#" & chrCol & ">"
                    colTagOn = True
                Else
                    If chrCol <> chrLastCol Then htmlTxt = htmlTxt & "</font><font color=#" & chrCol & ">"
                End If
            Else
                chrCol = "NONE"
                If colTagOn Then
                    htmlTxt = htmlTxt & "</font>"
                    colTagOn = False
                End If
            End If
            chrLastCol = chrCol

            If .Font.Bold = True Then
                If Not bldTagOn Then
                    htmlTxt = htmlTxt & "<b>"
                    bldTagOn = True
                End If
            Else
                If bldTagOn Then
                    htmlTxt = htmlTxt & "</b>"
                    bldTagOn = False
                End If
            End If

            If .Font.Italic = True Then
                If Not itlTagOn Then
                    htmlTxt = htmlTxt & "<i>"
                    itlTagOn = True
                End If
            Else
                If itlTagOn Then
                    htmlTxt = htmlTxt & "</i>"
                    itlTagOn = False
                End If
            End If

            If .Font.Underline > 0 Then
                If Not ulnTagOn Then
                    htmlTxt = htmlTxt & "<u>"
                    ulnTagOn = True
                End If
            Else
                If ulnTagOn Then
                    htmlTxt = htmlTxt & "</u>"
                    ulnTagOn = False
                End If
            End If

            If (Asc(.Text) = 10) Then
                htmlTxt = htmlTxt & "<br>"
            Else
                htmlTxt = htmlTxt & .Text
            End If
        End With
    Next

    If colTagOn Then
        htmlTxt = htmlTxt & "</font>"
        colTagOn = False
    End If
    If bldTagOn Then
        htmlTxt = htmlTxt & "</b>"
        bldTagOn = False
    End If
    If itlTagOn Then
        htmlTxt = htmlTxt & "</i>"
        itlTagOn = False
    End If
    If ulnTagOn Then
        htmlTxt = htmlTxt & "</u>"
        ulnTagOn = False
    End If
    If phaTagOn Then
        htmlTxt = htmlTxt & "</p>"
        phaTagOn = False
    End If
    htmlTxt = htmlTxt & "</div>"
    fnConvert2HTML = htmlTxt
End Function

Function GetCol(strCol As String) As String
    Dim rVal, gVal, bVal As String
    strCol = Right("000000" & Hex(strCol), 6)
    bVal = Left(strCol, 2)
    gVal = Mid(strCol, 3, 2)
    rVal = Right(strCol, 2)
    GetCol = rVal & gVal & bVal
End Function

Sub ApplyHTMLToCurrentDoc()
Application.ScreenUpdating = False
With ActiveDocument.Range
  '.ListFormat.ConvertNumbersToText
  With .Find
    .ClearFormatting
    .Replacement.ClearFormatting
    .Format = True
    .Forward = True
    .MatchWildcards = True
    .Wrap = wdFindContinue
    .Font.Underline = True
    .Text = ""
    .Replacement.Text = "<u>^&</u>"
    .Execute Replace:=wdReplaceAll
    .ClearFormatting
    .Font.Bold = True
    .Replacement.Text = "<b>^&</b>"
    .Execute Replace:=wdReplaceAll
    .ClearFormatting
    .Font.Italic = True
    .Replacement.Text = "<i>^&</i>"
    .Execute Replace:=wdReplaceAll
    .ClearFormatting
    .Highlight = True
    .Replacement.Text = "<h>^&</h>"
    .Execute Replace:=wdReplaceAll
  End With
End With
Application.ScreenUpdating = True
End Sub