import express from "express"
import { PrismaClient } from "@prisma/client"

const app = express()
const prisma = new PrismaClient()

app.use(express.json())

app.post("/identify", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: "Either email or phoneNumber must be provided"
      })
    }

    // Step 1: Find direct matches
    const matchingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          email ? { email } : undefined,
          phoneNumber ? { phoneNumber } : undefined
        ].filter(Boolean) as any
      },
      orderBy: { createdAt: "asc" }
    })

    // Step 2: If no matches → create new primary
    if (matchingContacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary"
        }
      })

      return res.json({
        contact: {
          primaryContactId: newContact.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: []
        }
      })
    }

    // Step 3: Collect all related primary IDs
    const relatedPrimaryIds = new Set<number>()

    for (const contact of matchingContacts) {
      if (contact.linkPrecedence === "primary") {
        relatedPrimaryIds.add(contact.id)
      } else if (contact.linkedId) {
        relatedPrimaryIds.add(contact.linkedId)
      }
    }

    // Step 4: Fetch full contact cluster
    const clusterContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: { in: Array.from(relatedPrimaryIds) } },
          { linkedId: { in: Array.from(relatedPrimaryIds) } }
        ]
      },
      orderBy: { createdAt: "asc" }
    })

    // Step 5: Determine oldest primary
    const primary = clusterContacts
      .filter(c => c.linkPrecedence === "primary")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]

    const primaryId = primary.id

    // Step 6: Convert extra primaries to secondary
    for (const contact of clusterContacts) {
      if (
        contact.linkPrecedence === "primary" &&
        contact.id !== primaryId
      ) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            linkPrecedence: "secondary",
            linkedId: primaryId
          }
        })
      }
    }

    // Step 7: Refresh cluster
    let finalCluster = await prisma.contact.findMany({
      where: {
        OR: [
          { id: primaryId },
          { linkedId: primaryId }
        ]
      },
      orderBy: { createdAt: "asc" }
    })

    const existingEmails = new Set(
      finalCluster.map(c => c.email).filter(Boolean)
    )

    const existingPhones = new Set(
      finalCluster.map(c => c.phoneNumber).filter(Boolean)
    )

    // Step 8: Create secondary if new info
    if (
      (email && !existingEmails.has(email)) ||
      (phoneNumber && !existingPhones.has(phoneNumber))
    ) {
      await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: primaryId
        }
      })

      // refresh again after insert
      finalCluster = await prisma.contact.findMany({
        where: {
          OR: [
            { id: primaryId },
            { linkedId: primaryId }
          ]
        },
        orderBy: { createdAt: "asc" }
      })
    }

    const finalPrimary = finalCluster.find(
      c => c.linkPrecedence === "primary"
    )!

    // ✅ Remove duplicates using Set
    const emails = Array.from(
      new Set(finalCluster.map(c => c.email).filter(Boolean))
    )

    const phoneNumbers = Array.from(
      new Set(finalCluster.map(c => c.phoneNumber).filter(Boolean))
    )

    return res.json({
      contact: {
        primaryContactId: finalPrimary.id,
        emails,
        phoneNumbers,
        secondaryContactIds: finalCluster
          .filter(c => c.linkPrecedence === "secondary")
          .map(c => c.id)
      }
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      error: "Internal Server Error"
    })
  }
})

app.get("/", (req, res) => {
  res.send("BiteSpeed Identity Reconciliation API is running 🚀")
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
